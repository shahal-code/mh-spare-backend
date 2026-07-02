import bcrypt from "bcryptjs";
import Admin from "../../models/adminModel.js";
import { generateToken } from "../../middleware/jwtMiddleware.js";
import { validateLogin } from "../../utils/validation.js";

/**
 * Handles admin/vendor registration
 */
export const register = async (req, res) => {
  try {
    const { fullname, email, password, storeDetails } = req.body;

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
 * Handles admin/owner login
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

    const token = generateToken(admin._id, "admin");

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * Handles session verification and returns admin details
 */
export const session = async (req, res) => {
  try {
    // verifyAdminJWT already checks the token and sets req.admin
    res.json({
      authenticated: true,
      admin: {
        id: req.admin._id,
        fullname: req.admin.fullname,
        email: req.admin.email,
        role: req.admin.role,
        status: req.admin.status
      }
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
};

/**
 * Handles admin logout (client side deletes token)
 */
export const logout = (req, res) => {
  res.json({ message: "Logout successful" });
};
