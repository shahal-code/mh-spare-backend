import * as AuthService from "../../services/user/authService.js";
import {
    validateSignupData,
    validateLoginData,
    validateEmail,
    validateOtp,
    validatePassword
} from "../../utils/validation.js";

export const loadlogin = async (req, res) => {
    try {
        const message = req.query.message || null;
        const errors = req.session.validationErrors || null;
        delete req.session.validationErrors;
        const email = req.query.email || null;
        res.render("user/auth/login", { message, errors, email });
    } catch (error) {
        console.error("Error loading login page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const errors = validateLoginData(req.body);
        if (errors) {
            req.session.validationErrors = errors;
            return res.redirect(303, `/user/login?email=${encodeURIComponent(email)}`);
        }

        const user = await AuthService.login(email, password);
        req.session.user = user._id;
        req.session.loginMethod = 'local';
        req.session.save((err) => {
            if (err) console.log("User session save error:", err);
            res.redirect(303, "/user/dashboard");
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.redirect(303, `/user/login?message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`);
    }
};

export const loadsignup = async (req, res) => {
    try {
        const message = req.query.message || null;
        const errors = req.session.validationErrors || null;
        delete req.session.validationErrors;
        const fullname = req.query.fullname || null;
        const email = req.query.email || null;
        const referralCode = req.query.referralCode || req.query.ref || null;
        res.render("user/auth/signup", { message, errors, fullname, email, referralCode });
    } catch (error) {
        console.error("Error loading signup page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const signup = async (req, res) => {
    const { fullname, email, password, referralCode } = req.body;
    try {
        const errors = validateSignupData(req.body);
        if (errors) {
            req.session.validationErrors = errors;
            return res.redirect(303, `/user/signup?fullname=${encodeURIComponent(fullname)}&email=${encodeURIComponent(email)}&referralCode=${encodeURIComponent(referralCode || '')}`);
        }

        const { userData, otp, otpExpiry } = await AuthService.prepareSignup(fullname, email, password, referralCode);

        req.session.userData = userData;
        req.session.otp = otp;
        req.session.otpExpiry = otpExpiry;

        req.session.save((err) => {
            if (err) console.log("Session save error:", err);
            res.redirect(303, "/user/otp");
        });
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.redirect(303, `/user/signup?message=${encodeURIComponent(error.message)}&fullname=${encodeURIComponent(fullname)}&email=${encodeURIComponent(email)}&referralCode=${encodeURIComponent(referralCode || '')}`);
    }
};

export const load_otp = async (req, res) => {
    try {
        if (!req.session.userData && !req.session.resetEmail) return res.redirect(303, "/user/signup");
        const message = req.query.message || null;
        const expiresIn = Math.max(0, Math.floor((req.session.otpExpiry - Date.now()) / 1000));
        res.render("user/auth/otp", { message, actionUrl: "/user/otp", resendUrl: "/user/resend-otp", expiresIn });
    } catch (error) {
        console.error("Error loading OTP page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const Verifyotp = async (req, res) => {
    const { otp } = req.body;
    try {
        const otpError = validateOtp(otp);
        if (otpError) return res.redirect(303, `/user/otp?message=${encodeURIComponent(otpError)}`);

        if (Date.now() > req.session.otpExpiry) return res.redirect(303, `/user/otp?message=${encodeURIComponent("OTP has expired. Please resend.")}`);

        if (otp === req.session.otp) {
            if (req.session.resetEmail) return res.redirect(303, "/user/reset-password");

            await AuthService.completeSignup(req.session.userData);
            delete req.session.userData;
            delete req.session.otp;
            delete req.session.otpExpiry;

            return res.redirect(303, "/user/login");
        } else {
            return res.redirect(303, `/user/otp?message=${encodeURIComponent("Invalid OTP. Please try again.")}`);
        }
    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        res.redirect(303, `/user/otp?message=${encodeURIComponent("Verification failed. Please try again.")}`);
    }
};

export const resendOTP = async (req, res) => {
    try {
        const email = req.session.userData ? req.session.userData.email : req.session.resetEmail;
        if (!email) return res.status(400).json({ success: false, message: "Session expired" });

        const { otp, otpExpiry } = await AuthService.resendOtp(email);
        req.session.otp = otp;
        req.session.otpExpiry = otpExpiry;

        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ success: false, message: "Failed to resend OTP" });
            }
            res.status(200).json({ success: true, message: "OTP resent successfully" });
        });
    } catch (error) {
        console.error("Resend OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
};

export const load_Forgot_Password = async (req, res) => {
    try {
        const message = req.query.message || null;
        const email = req.query.email || null;
        res.render("user/auth/forgot-password", { message, email });
    } catch (error) {
        console.error("Error loading forgot password page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const fogotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const emailError = validateEmail(email);
        if (emailError) return res.redirect(303, `/user/forgot-password?message=${encodeURIComponent(emailError)}&email=${encodeURIComponent(email)}`);

        const { otp, otpExpiry } = await AuthService.preparePasswordReset(email);

        req.session.resetEmail = email;
        req.session.otp = otp;
        req.session.otpExpiry = otpExpiry;

        req.session.save((err) => {
            if (err) console.log("Session save error:", err);
            res.redirect(303, "/user/otp");
        });
    } catch (error) {
        console.error("Forgot Password Error:", error.message);
        res.redirect(303, `/user/forgot-password?message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`);
    }
};

export const load_reset_password = async (req, res) => {
    const message = req.query.message || null;
    res.render("user/auth/reset-password", { message });
};

export const reset_Password = async (req, res) => {
    const { password, confirmPassword } = req.body;
    try {
        const passwordError = validatePassword(password);
        if (passwordError) return res.redirect(303, `/user/reset-password?message=${encodeURIComponent(passwordError)}`);
        if (password !== confirmPassword) return res.redirect(303, `/user/reset-password?message=${encodeURIComponent("Passwords do not match")}`);

        await AuthService.resetPassword(req.session.resetEmail, password);

        delete req.session.resetEmail;
        delete req.session.otp;
        delete req.session.otpExpiry;

        res.redirect(303, "/user/login");
    } catch (error) {
        console.error("Password Reset Error:", error.message);
        res.redirect(303, `/user/reset-password?message=${encodeURIComponent("Password reset failed. Please try again.")}`);
    }
};

export const isLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Logout error:", err);
            return res.redirect("/user");
        }
        res.clearCookie("user.id");
        // res.header("Clear-Site-Data", '"cache", "cookies", "storage"');
        res.redirect("/user/login");
    });
};
