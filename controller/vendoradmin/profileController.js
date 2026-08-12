import bcrypt from "bcryptjs";
import Coupon from "../../models/couponModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Order from "../../models/ordersModel.js";
import Product from "../../models/productModel.js";
import { validateLogin } from "../../utils/validation.js";
import Banner from "../../models/bannerModel.js";
import * as DashboardService from "../../services/vendoradmin/dashboardService.js";
import * as CustomerService from "../../services/vendoradmin/customerService.js";
import * as CategoryService from "../../services/vendoradmin/categoryService.js";
import * as ProductService from "../../services/vendoradmin/productService.js";
import * as OrderService from "../../services/vendoradmin/ordersService.js";
import CouponService from "../../services/vendoradmin/couponService.js";
import OfferService from "../../services/vendoradmin/offerService.js";
import { addClient, removeClient } from "../../utils/sseManager.js";
import * as ReportService from "../../services/vendoradmin/reportService.js";
import ActivityLog from "../../models/activityLogModel.js";
import Notification from "../../models/notificationModel.js";
import Admin from "../../models/adminModel.js";
import { notifySuperAdmins } from "../../services/vendoradmin/notificationService.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

// Owner routes for vendor management
export const updateOwnPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required." });
    
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
    
    admin.storeDetails = admin.storeDetails || {};
    admin.storeDetails.phone = phone;
    await admin.save();
    
    res.json({ success: true, message: "Phone number updated successfully." });
  } catch (err) {
    sendError(res, err);
  }
};

export const updateOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Both current and new passwords are required." });
    
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
    
    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) return res.status(400).json({ success: false, message: "Incorrect current password." });
    
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    await ActivityLog.create({
      adminId: admin._id,
      role: admin.role,
      action: "UPDATED_PROFILE",
      details: "Updated password",
      ipAddress: req.ip
    });
    
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    sendError(res, err);
  }
};

export const uploadKycDocuments = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, message: "No documents provided" });
    }

    if (!admin.kycDocuments) admin.kycDocuments = {};

    if (req.files.idProof && req.files.idProof.length > 0) {
      admin.kycDocuments.idProof = req.files.idProof[0].path;
    }
    
    if (req.files.businessLicense && req.files.businessLicense.length > 0) {
      admin.kycDocuments.businessLicense = req.files.businessLicense[0].path;
    }

    admin.kycStatus = 'pending';
    await admin.save();

    await ActivityLog.create({
      adminId: admin._id,
      role: admin.role,
      action: "UPDATED_PROFILE",
      details: "Uploaded KYC documents",
      ipAddress: req.ip
    });

    await notifySuperAdmins(
      "KYC Pending Review",
      `Vendor ${admin.fullname || admin.storeDetails?.storeName || 'Unknown'} has uploaded KYC documents for review.`,
      "warning",
      `/superadmin/vendors/${admin._id}`
    );

    res.json({ 
      success: true, 
      message: "KYC documents uploaded successfully. Your status is now pending review.",
      kycDocuments: admin.kycDocuments,
      kycStatus: admin.kycStatus
    });

  } catch (error) {
    console.error("Upload KYC error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// --- NOTIFICATIONS ---
