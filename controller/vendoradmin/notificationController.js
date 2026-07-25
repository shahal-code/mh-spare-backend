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

import Admin from "../../models/adminModel.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

// Owner routes for vendor management
export const getNotifications = async (req, res) => {
  try {
    const { getAdminNotifications } = await import('../../services/vendoradmin/notificationService.js');
    const notifications = await getAdminNotifications(req.admin.id);
    res.json({ success: true, notifications });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const { markNotificationsAsRead } = await import('../../services/vendoradmin/notificationService.js');
    await markNotificationsAsRead(req.admin.id, req.body.notificationId || null);
    res.json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// --- REAL-TIME SSE STREAM ---
export const streamNotifications = (req, res) => {
  const adminId = String(req.admin.id);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Register this connection
  addClient(adminId, res);

  // Send a heartbeat every 25s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 25000);

  // Send a "connected" confirmation immediately
  res.write(`event: connected\ndata: ${JSON.stringify({ adminId })}\n\n`);

  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(adminId);
  });
};
