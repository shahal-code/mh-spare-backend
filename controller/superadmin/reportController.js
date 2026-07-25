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
export const reports = async (req, res) => {
  try {
    const data = await ReportService.getReportData(
      req.query.filter || "today",
      req.query.start || null,
      req.query.end || null,
      parseInt(req.query.page) || 1,
      req.admin,
      req.query.type || "sales"
    );
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
