import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import { getCache } from "../utils/cacheHelper.js";
import { CACHE_KEYS } from "../utils/cacheKeys.js";

// Ensure secrets are available
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

/**
 * Middleware to verify Admin JWT tokens
 */
export const verifyAdminJWT = async (req, res, next) => {
  try {
    // Accept token from Authorization header OR query string (needed for SSE EventSource)
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await getCache(CACHE_KEYS.JWT_BLACKLIST(token));
    if (isBlacklisted) {
      return res.status(401).json({ message: "Token has been logged out and revoked." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "admin") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin account not found" });
    }

    if (admin.status !== "active" && admin.role !== "owner") {
      return res.status(403).json({ message: `Account is ${admin.status}. Please contact the owner.` });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    console.error("Admin JWT Verification Error:", error.message);
    res.status(401).json({ message: "Token is not valid or expired" });
  }
};

/**
 * Middleware to verify User JWT tokens
 */
export const verifyUserJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted in Redis
    const isBlacklisted = await getCache(CACHE_KEYS.JWT_BLACKLIST(token));
    if (isBlacklisted) {
      return res.status(401).json({ message: "Token has been logged out and revoked." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "user") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User account is blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("User JWT Verification Error:", error.message);
    res.status(401).json({ message: "Token is not valid or expired" });
  }
};

/**
 * Helper to generate JWT
 */
export const generateToken = (id, type) => {
  return jwt.sign({ id, type }, JWT_SECRET, {
    expiresIn: "1d",
  });
};
