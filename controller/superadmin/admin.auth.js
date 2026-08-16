import bcrypt from "bcryptjs";
import Admin from "../../models/adminModel.js";
import { generateToken } from "../../middleware/jwtMiddleware.js";
import { validateLogin } from "../../utils/validation.js";
import { sendOtpEmail } from "../../config/nodemailer.js";

/**
 * Handles admin/vendor registration
 */
export const register = async (req, res) => {
  try {
    const { fullname, email, password, storeDetails } = req.body;

    if (!email || !email.toLowerCase().trim().endsWith("@gmail.com")) {
      return res.status(400).json({ message: "Only @gmail.com email addresses are allowed." });
    }

    // Check if email exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin (default role 'admin', status 'pending')
    const admin = new Admin({
      fullname,
      email,
      password: hashedPassword,
      storeDetails
    });

    await admin.save();
    res.status(201).json({ message: "Registration successful. Please wait for owner approval." });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/**
 * Handles admin/owner login (Sends 2FA OTP for Super Admin)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validationError = validateLogin(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (admin.status !== "active" && admin.role !== "owner") {
      return res.status(403).json({ message: `Your account is ${admin.status}. Please contact the owner.` });
    }

    // Require 2FA OTP for Super Admin (owner)
    if (admin.role === "owner") {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      admin.loginOtp = otp;
      admin.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
      await admin.save();

      await sendOtpEmail(admin.email, otp, 'admin-2fa');

      return res.json({
        success: true,
        requireOtp: true,
        email: admin.email,
        message: "A 6-digit OTP code has been sent to your registered Gmail address."
      });
    }

    const token = generateToken(admin._id, "admin");

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        kycStatus: admin.kycStatus,
        kycDocuments: admin.kycDocuments
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * Verifies Super Admin 2FA OTP and issues token
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || admin.role !== "owner") {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!admin.loginOtp || admin.loginOtp !== otp.toString().trim()) {
      return res.status(400).json({ message: "Invalid OTP code. Please check your email and try again." });
    }

    if (admin.loginOtpExpires && new Date() > admin.loginOtpExpires) {
      return res.status(400).json({ message: "OTP has expired. Please click Resend OTP." });
    }

    // Clear OTP fields
    admin.loginOtp = undefined;
    admin.loginOtpExpires = undefined;
    await admin.save();

    const token = generateToken(admin._id, "admin");

    res.json({
      message: "2FA Verification successful",
      token,
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        kycStatus: admin.kycStatus,
        kycDocuments: admin.kycDocuments
      }
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    res.status(500).json({ message: "Server error during OTP verification" });
  }
};

/**
 * Resends 2FA OTP code
 */
export const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email });
    if (!admin || admin.role !== "owner") {
      return res.status(400).json({ message: "Invalid request" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.loginOtp = otp;
    admin.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await admin.save();

    await sendOtpEmail(admin.email, otp);

    res.json({ success: true, message: "A new 6-digit OTP code has been sent to your email." });
  } catch (error) {
    console.error("Resend login OTP error:", error);
    res.status(500).json({ message: "Server error while resending OTP" });
  }
};

/**
 * Handles session verification and returns admin details
 */
export const session = async (req, res) => {
  try {
    const Order = (await import("../../models/ordersModel.js")).default;
    let returnQuery = { "orderedItems.status": "Return Request" };
    if (req.admin && req.admin.role !== 'owner') {
      returnQuery["orderedItems.adminId"] = req.admin._id;
    }
    const returnCount = await Order.countDocuments(returnQuery);

    res.json({
      authenticated: true,
      returnCount,
      admin: {
        id: req.admin._id,
        fullname: req.admin.fullname,
        email: req.admin.email,
        role: req.admin.role,
        status: req.admin.status,
        storeDetails: req.admin.storeDetails,
        isCouponEnabled: Boolean(req.admin.isCouponEnabled),
        kycStatus: req.admin.kycStatus,
        kycDocuments: req.admin.kycDocuments
      }
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
};

import { setCache } from "../../utils/cacheHelper.js";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheKeys.js";

/**
 * Handles admin logout (Blacklists token in Redis)
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await setCache(CACHE_KEYS.JWT_BLACKLIST(token), "revoked", CACHE_TTL.JWT_BLACKLIST);
    }
    res.json({ message: "Logout successful and token revoked" });
  } catch (error) {
    res.json({ message: "Logout successful" });
  }
};
