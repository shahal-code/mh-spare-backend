import bcrypt from "bcryptjs";
import Coupon from "../../models/couponModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Order from "../../models/ordersModel.js";
import Product from "../../models/productModel.js";
import { validateLogin } from "../../utils/validation.js";
import Banner from "../../models/bannerModel.js";
import * as DashboardService from "../../services/superadmin/dashboardService.js";
import * as CustomerService from "../../services/superadmin/customerService.js";
import * as CategoryService from "../../services/superadmin/categoryService.js";
import * as ProductService from "../../services/superadmin/productService.js";
import * as OrderService from "../../services/superadmin/ordersService.js";
import CouponService from "../../services/superadmin/couponService.js";
import OfferService from "../../services/superadmin/offerService.js";
import { addClient, removeClient } from "../../utils/sseManager.js";
import * as ReportService from "../../services/superadmin/reportService.js";
import ActivityLog from "../../models/activityLogModel.js";

import Admin from "../../models/adminModel.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

// Owner routes for vendor management
export const returns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const data = await OrderService.getReturnRequests(req.query, page, limit);
    res.json({ ...data, page, limit, search: req.query.search || "" });
  } catch (error) {
    sendError(res, error);
  }
};

export const orders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    // Add admin filtering to the query
    const filterQuery = { ...req.query };
    if (req.admin.role !== 'owner') {
      filterQuery.adminId = req.admin._id;
    }

    const data = await OrderService.getAllOrders(filterQuery, page, limit, req.admin);
    const stats = await OrderService.getOrderStats(req.admin);
    res.json({ ...data, page, limit, filters: req.query, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const order = async (req, res) => {
  try {
    const data = await OrderService.getOrderById(req.params.orderId);
    if (!data) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ order: data });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await OrderService.updateOrderStatus(req.body.orderId, req.body.status);
    if (!order) return res.status(400).json({ success: false, message: "Failed to update status" });

    // Send status update email to the user — fire and forget (don't block response)
    (async () => {
      try {
        const User = (await import('../../models/userModel.js')).default;
        const { sendUserOrderStatusEmail } = await import('../../config/nodemailer.js');
        const user = await User.findById(order.userId).select('email fullname').lean();
        if (user?.email) {
          await sendUserOrderStatusEmail(
            user.email,
            user.fullname || 'Customer',
            order,
            req.body.status
          );
        }
      } catch (emailErr) {
        console.error('Order status email error:', emailErr.message);
      }
    })();

    res.json({ success: true, order, message: "Order status updated successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateOrderItemStatus = async (req, res) => {
  try {
    const order = await OrderService.updateOrderItemStatus(req.body.orderId, req.body.itemId, req.body.status);
    res.json({ success: true, order, message: "Item status updated successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return sendError(res, new Error("No orders selected"), 400);
    }
    const result = await OrderService.bulkUpdateOrderStatus(orderIds, status);
    res.json({ success: true, message: `Bulk update complete. Success: ${result.successCount}, Failed: ${result.failedCount}` });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateItemTracking = async (req, res) => {
  try {
    const { trackingNumber, courierName } = req.body;
    await OrderService.updateOrderItemTracking(req.params.id, req.params.itemId, { trackingNumber, courierName });
    res.json({ success: true, message: "Tracking info updated" });
  } catch (error) {
    sendError(res, error);
  }
};
