import * as AuthService from "../../services/user/authService.js";
import {
    validateSignupData,
    validateLoginData,
    validateEmail,
    validateOtp,
    validatePassword
} from "../../utils/validation.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Helper to create token
const createToken = (payload, expiresIn) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const errors = validateLoginData(req.body);
        if (errors) {
            return res.status(400).json({ success: false, message: "Validation error", errors });
        }

        const user = await AuthService.login(email, password);
        const token = createToken({ id: user._id, type: "user" }, "24h");
        
        res.status(200).json({ success: true, message: "Login successful", token, user: { id: user._id, fullname: user.fullname, email: user.email, isGoogleAuth: !!user.googleId } });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(401).json({ success: false, message: error.message });
    }
};

export const signup = async (req, res) => {
    const { fullname, email, password, referralCode } = req.body;
    try {
        const errors = validateSignupData(req.body);
        if (errors) {
            return res.status(400).json({ success: false, message: "Validation error", errors });
        }

        const { userData, otp, otpExpiry } = await AuthService.prepareSignup(fullname, email, password, referralCode);

        // Sign the userData and OTP into a temporary token
        const signupToken = createToken({ type: "signup", userData, otp, otpExpiry }, "10m");

        res.status(200).json({ success: true, message: "OTP sent successfully", signupToken });
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const Verifyotp = async (req, res) => {
    const { otp, signupToken, resetToken } = req.body;
    try {
        const otpError = validateOtp(otp);
        if (otpError) return res.status(400).json({ success: false, message: otpError });

        const token = signupToken || resetToken;
        if (!token) return res.status(400).json({ success: false, message: "Token is required" });

        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (Date.now() > decoded.otpExpiry) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please resend." });
        }
        
        console.log(`Verifying OTP - Received: '${otp}', Expected: '${decoded.otp}'`);

        if (String(otp) === String(decoded.otp)) {
            if (decoded.type === "reset") {
                const verifiedResetToken = createToken({ type: "reset_verified", email: decoded.email }, "15m");
                return res.status(200).json({ success: true, message: "OTP verified", verifiedResetToken });
            } else if (decoded.type === "signup") {
                const user = await AuthService.completeSignup(decoded.userData);
                const authToken = createToken({ id: user._id, type: "user" }, "24h");
                return res.status(201).json({ success: true, message: "Account created successfully", token: authToken, user: { id: user._id, fullname: user.fullname, email: user.email } });
            } else {
                return res.status(400).json({ success: false, message: "Invalid token type" });
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        res.status(401).json({ success: false, message: "Verification failed. Token may be invalid or expired." });
    }
};

export const resendOTP = async (req, res) => {
    const { signupToken, resetToken } = req.body;
    try {
        const token = signupToken || resetToken;
        if (!token) return res.status(400).json({ success: false, message: "Token is required" });
        
        // Use ignoreExpiration to allow resending even if the 10m token expired, 
        // though typically they resend within the window.
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        const email = decoded.userData ? decoded.userData.email : decoded.email;
        
        if (!email) return res.status(400).json({ success: false, message: "Invalid token payload" });

        const { otp, otpExpiry } = await AuthService.resendOtp(email);
        
        // Re-sign the token with the new OTP
        let newToken;
        if (decoded.type === "signup") {
            newToken = createToken({ type: "signup", userData: decoded.userData, otp, otpExpiry }, "10m");
        } else if (decoded.type === "reset") {
            newToken = createToken({ type: "reset", email, otp, otpExpiry }, "10m");
        }
        
        res.status(200).json({ success: true, message: "OTP resent successfully", token: newToken, tokenType: decoded.type });
    } catch (error) {
        console.error("Resend OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
};

export const fogotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const emailError = validateEmail(email);
        if (emailError) return res.status(400).json({ success: false, message: emailError });

        const { otp, otpExpiry } = await AuthService.preparePasswordReset(email);

        const resetToken = createToken({ type: "reset", email, otp, otpExpiry }, "10m");

        res.status(200).json({ success: true, message: "Password reset OTP sent", resetToken });
    } catch (error) {
        console.error("Forgot Password Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const reset_Password = async (req, res) => {
    const { password, confirmPassword, verifiedResetToken } = req.body;
    try {
        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ success: false, message: passwordError });
        if (password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });

        if (!verifiedResetToken) return res.status(400).json({ success: false, message: "Reset token is required" });

        const decoded = jwt.verify(verifiedResetToken, JWT_SECRET);
        if (decoded.type !== "reset_verified") return res.status(400).json({ success: false, message: "Invalid reset token" });

        await AuthService.resetPassword(decoded.email, password);

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Password Reset Error:", error.message);
        res.status(401).json({ success: false, message: "Password reset failed. Token may be invalid or expired." });
    }
};

export const isLogout = (req, res) => {
    // In stateless JWT, logout is primarily handled on the client-side by deleting the token.
    // If we wanted to blacklist tokens, we would implement it here.
    res.status(200).json({ success: true, message: "Logged out successfully" });
};
