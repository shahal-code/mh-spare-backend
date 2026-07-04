import * as ProfileService from "../../services/user/profileService.js";
import { validateChangePasswordData, validateEmail } from '../../utils/validation.js';
import { sendVerificationLink, sendOtpEmail } from '../../config/nodemailer.js';
import crypto from 'crypto';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const createToken = (payload, expiresIn) => jwt.sign(payload, JWT_SECRET, { expiresIn });

export const getProfileDetails = async (req, res) => {
    try {
        const user = await ProfileService.getProfile(req.user._id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error loading profile:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullname, phone } = req.body;
        const updateData = { fullname, phone };

        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        const updatedUser = await ProfileService.updateProfile(userId, updateData);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Edit Profile Error:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user._id;
        const errors = validateChangePasswordData(req.body);
        if (errors) return res.status(400).json({ success: false, message: "Validation error", errors });

        await ProfileService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(error.message === "Incorrect current password" ? 400 : 500).json({ 
            success: false, 
            message: error.message || "Internal server error" 
        });
    }
};

export const requestChangeEmailOtp = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await ProfileService.getProfile(userId);
        
        if (!user || !user.email) {
            return res.status(400).json({ success: false, message: "Could not find current email address." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes

        const isSent = await sendOtpEmail(user.email, otp);
        if (!isSent) {
            return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
        }

        const emailChangeToken = createToken({ type: "change_email_otp", otp, otpExpiry, userId }, "5m");

        res.status(200).json({ success: true, message: "OTP sent to your current email address.", emailChangeToken });
    } catch (error) {
        console.error("Request OTP Error:", error);
        res.status(500).json({ success: false, message: "Failed to request OTP." });
    }
};

export const verifyChangeEmailOtp = async (req, res) => {
    try {
        const { otp, emailChangeToken } = req.body;
        
        if (!emailChangeToken) return res.status(400).json({ success: false, message: "Token is required." });

        const decoded = jwt.verify(emailChangeToken, JWT_SECRET);
        
        if (decoded.type !== "change_email_otp") return res.status(400).json({ success: false, message: "Invalid token type." });
        
        if (decoded.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }
        if (Date.now() > decoded.otpExpiry) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        const verifiedEmailToken = createToken({ type: "change_email_verified", userId: decoded.userId }, "15m");

        res.status(200).json({ success: true, message: "Current email verified successfully.", verifiedEmailToken });
    } catch (error) {
        console.error("Verify OTP Error:", error.message);
        res.status(401).json({ success: false, message: "Failed to verify OTP. Token may be expired." });
    }
};

export const sendChangeEmailLink = async (req, res) => {
    try {
        const { newEmail, verifiedEmailToken } = req.body;
        const userId = req.user._id;

        if (!verifiedEmailToken) {
            return res.status(403).json({ success: false, message: "Please verify your current email first." });
        }
        
        const decoded = jwt.verify(verifiedEmailToken, JWT_SECRET);
        if (decoded.type !== "change_email_verified" || decoded.userId !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Invalid or expired verification token." });
        }

        const emailError = validateEmail(newEmail);
        if (emailError) return res.status(400).json({ success: false, message: emailError });

        const user = await ProfileService.getProfile(userId);
        if (user.email === newEmail) return res.status(400).json({ success: false, message: "This is already your current email address" });

        const changeEmailLinkToken = createToken({ type: "change_email_link", newEmail, userId }, "15m");

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const verificationLink = `${frontendUrl}/profile/change-email/verify?token=${changeEmailLinkToken}`;

        await sendVerificationLink(newEmail, verificationLink);

        res.status(200).json({
            success: true,
            message: "A verification link has been sent to your new email address. Please check your inbox (and spam folder)."
        });

    } catch (error) {
        console.error("Send Email Link Error:", error);
        res.status(500).json({ success: false, message: "Failed to send verification link. Please try again later." });
    }
};

export const verifyChangeEmailLink = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) return res.status(400).json({ success: false, message: "Token is required." });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== "change_email_link") {
            return res.status(400).json({ success: false, message: "Invalid verification link." });
        }

        const userId = decoded.userId;
        const newEmail = decoded.newEmail;

        await ProfileService.updateEmail(userId, newEmail);

        res.status(200).json({ success: true, message: "Email address updated successfully!" });
    } catch (error) {
        console.error("Verify Email Link Error:", error.message);
        res.status(400).json({ success: false, message: "An error occurred during verification. Link may be expired." });
    }
};
