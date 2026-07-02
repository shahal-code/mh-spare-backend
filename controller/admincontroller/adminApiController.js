import Coupon from "../../models/couponModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Order from "../../models/ordersModel.js";
import Product from "../../models/productModel.js";
import { validateLogin } from "../../utils/validation.js";
import * as DashboardService from "../../services/admin/dashboardService.js";
import * as CustomerService from "../../services/admin/customerService.js";
import * as CategoryService from "../../services/admin/categoryService.js";
import * as ProductService from "../../services/admin/productService.js";
import * as OrderService from "../../services/admin/ordersService.js";
import CouponService from "../../services/admin/couponService.js";
import OfferService from "../../services/admin/offerService.js";
import * as ReportService from "../../services/admin/reportService.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const login = (req, res) => {
  const { email, password } = req.body;
  const validationError = validateLogin(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "12345";

  if (email === adminEmail && password === adminPassword) {
    req.session.admin = true;
    return req.session.save((err) => {
      if (err) return sendError(res, err);
      res.json({ success: true, message: "Logged in successfully" });
    });
  }

  res.status(401).json({ success: false, message: "Invalid login credentials" });
};

export const session = async (req, res) => {
  const returnCount = await Order.countDocuments({ "orderedItems.status": "Return Request" });
  res.json({ authenticated: Boolean(req.session.admin), returnCount });
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return sendError(res, err);
    res.clearCookie("admin.sid");
    res.json({ success: true });
  });
};

export const dashboard = async (req, res) => {
  try {
    res.json(await DashboardService.getDashboardStats());
  } catch (error) {
    sendError(res, error);
  }
};

export const dashboardChart = async (req, res) => {
  try {
    res.json(await DashboardService.getChartData(req.query.filter || "monthly"));
  } catch (error) {
    sendError(res, error);
  }
};

export const users = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const query = {
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
    const data = await CustomerService.getAllUsers(query, page, limit);
    const stats = await CustomerService.getCustomerStats();
    res.json({ ...data, page, limit, search, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const toggleUser = async (req, res) => {
  try {
    const user = await CustomerService.toggleBlockStatus(req.params.id);
    res.json({ success: true, user });
  } catch (error) {
    sendError(res, error, error.message === "User not found" ? 404 : 500);
  }
};

export const categories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const search = req.query.search || "";
    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const data = await CategoryService.getAllCategories(query, page, limit);
    const stats = await CategoryService.getCategoryStats();
    res.json({ ...data, page, limit, search, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const categoryOptions = async (req, res) => {
  try {
    const categories = await Category.find({ is_blocked: false }).sort({ name: 1 }).lean();
    res.json({ categories });
  } catch (error) {
    sendError(res, error);
  }
};

export const category = async (req, res) => {
  try {
    const data = await CategoryService.getCategoryById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ category: data });
  } catch (error) {
    sendError(res, error);
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({ success: true, category, message: "Category added successfully" });
  } catch (error) {
    sendError(res, error, error.message === "Category already exists" ? 400 : 500);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, category, message: "Category updated successfully" });
  } catch (error) {
    const status = error.message === "Category not found" ? 404 : error.message === "Category name already exists" ? 400 : 500;
    sendError(res, error, status);
  }
};

export const toggleCategory = async (req, res) => {
  try {
    const category = await CategoryService.toggleCategoryStatus(req.params.id);
    res.json({ success: true, category, is_blocked: category.is_blocked });
  } catch (error) {
    sendError(res, error, error.message === "Category not found" ? 404 : 500);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    sendError(res, error, error.message === "Category not found" ? 404 : 500);
  }
};

export const products = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const search = req.query.search || "";
    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const data = await ProductService.getAllProducts(query, page, limit);
    const activeProductsCount = await Product.countDocuments({ is_blocked: false });
    const inactiveProductsCount = await Product.countDocuments({ is_blocked: true });
    res.json({ ...data, page, limit, search, activeProductsCount, inactiveProductsCount });
  } catch (error) {
    sendError(res, error);
  }
};

export const productOptions = async (req, res) => {
  try {
    const products = await Product.find({ is_unlisted: false, is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
    res.json({ products });
  } catch (error) {
    sendError(res, error);
  }
};

export const product = async (req, res) => {
  try {
    const data = await ProductService.getProductById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ product: data });
  } catch (error) {
    sendError(res, error);
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await ProductService.toggleProductStatus(req.params.id);
    res.json({ success: true, product, is_blocked: product.is_blocked });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    sendError(res, error, error.message === "Product not found" ? 404 : 500);
  }
};

export const createVariant = async (req, res) => {
  try {
    const product = await ProductService.addVariant(req.params.id, req.body, req.files);
    res.status(201).json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateVariant = async (req, res) => {
  try {
    const product = await ProductService.updateVariant(req.params.id, req.params.variantId, req.body, req.files);
    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const deleteVariant = async (req, res) => {
  try {
    const product = await ProductService.deleteVariant(req.params.id, req.params.variantId);
    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error);
  }
};

export const orders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const data = await OrderService.getAllOrders(req.query, page, limit);
    const stats = {
      totalOrdersCount: await Order.countDocuments(),
      pendingOrdersCount: await Order.countDocuments({ status: "Pending" }),
      canceledOrdersCount: await Order.countDocuments({ status: "Cancelled" }),
      completedOrdersCount: await Order.countDocuments({ status: "Delivered" }),
    };
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

export const returns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await OrderService.getReturnRequests(req.query, page, limit);
    res.json({ ...data, page, limit, search: req.query.search || "" });
  } catch (error) {
    sendError(res, error);
  }
};

export const coupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const stats = await CouponService.getCouponStats();
    res.json({ coupons, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const coupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ coupon });
  } catch (error) {
    sendError(res, error);
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = req.body;
    if (!code || !discountType || !discountValue || !expirationDate) {
      return res.status(400).json({ success: false, message: "All required fields must be filled." });
    }
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ success: false, message: "A coupon with this code already exists." });
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      expirationDate: new Date(expirationDate),
      isActive: true,
    });
    res.status(201).json({ success: true, coupon, message: "Coupon created successfully!" });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = req.body;
    if (!code || !discountType || !discountValue || !expirationDate) {
      return res.status(400).json({ success: false, message: "All required fields must be filled." });
    }
    const existing = await Coupon.findOne({ code: code.toUpperCase(), _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ success: false, message: "Another coupon with this code already exists." });
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, {
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      expirationDate: new Date(expirationDate),
    }, { new: true });
    res.json({ success: true, coupon, message: "Coupon updated successfully!" });
  } catch (error) {
    sendError(res, error);
  }
};

export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Coupon deleted successfully." });
  } catch (error) {
    sendError(res, error);
  }
};

export const offers = async (req, res) => {
  try {
    const offers = await Offer.find({ offerType: { $in: ADMIN_OFFER_TYPES } }).sort({ createdAt: -1 }).lean();
    const stats = await OfferService.getOfferStats();
    res.json({ offers, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const offerMeta = async (req, res) => {
  try {
    const products = await Product.find({ is_unlisted: false, is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
    const categories = await Category.find({ is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
    res.json({ products, categories });
  } catch (error) {
    sendError(res, error);
  }
};

export const offer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();
    if (!offer || !ADMIN_OFFER_TYPES.includes(offer.offerType)) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    res.json({ offer });
  } catch (error) {
    sendError(res, error);
  }
};

export const createOffer = async (req, res) => {
  try {
    const { name, description, offerType, discountType, discountValue, maxDiscountAmount, applicableTo, startDate, endDate } = req.body;
    if (!name || !offerType || !discountType || !discountValue || !startDate || !endDate || !applicableTo) {
      return res.status(400).json({ success: false, message: "Required fields are missing." });
    }
    if (!ADMIN_OFFER_TYPES.includes(offerType)) {
      return res.status(400).json({ success: false, message: "Only product and category offers can be managed from admin." });
    }
    const offer = await Offer.create({
      name,
      description,
      offerType,
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      applicableTo,
      applicableModel: offerType === "product" ? "Product" : "Category",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    });
    res.status(201).json({ success: true, offer, message: "Offer created successfully!" });
  } catch (error) {
    sendError(res, error.code === 11000 ? new Error("Please use a unique offer name.") : error, error.code === 11000 ? 400 : 500);
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { name, description, discountType, discountValue, maxDiscountAmount, applicableTo, startDate, endDate } = req.body;
    if (!name || !discountType || !discountValue || !startDate || !endDate || !applicableTo) {
      return res.status(400).json({ success: false, message: "Required fields are missing." });
    }
    const existingOffer = await Offer.findById(req.params.id).select("offerType");
    if (!existingOffer || !ADMIN_OFFER_TYPES.includes(existingOffer.offerType)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }
    const offer = await Offer.findByIdAndUpdate(req.params.id, {
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      applicableTo,
      applicableModel: existingOffer.offerType === "product" ? "Product" : "Category",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }, { new: true });
    res.json({ success: true, offer, message: "Offer updated successfully!" });
  } catch (error) {
    sendError(res, error.code === 11000 ? new Error("Please use a unique offer name.") : error, error.code === 11000 ? 400 : 500);
  }
};

export const toggleOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer || !ADMIN_OFFER_TYPES.includes(offer.offerType)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }
    offer.isActive = !offer.isActive;
    await offer.save();
    res.json({ success: true, offer });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).select("offerType");
    if (!offer || !ADMIN_OFFER_TYPES.includes(offer.offerType)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Offer deleted successfully." });
  } catch (error) {
    sendError(res, error);
  }
};

export const reports = async (req, res) => {
  try {
    const data = await ReportService.getReportData(
      req.query.filter || "today",
      req.query.start || null,
      req.query.end || null,
      parseInt(req.query.page) || 1
    );
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
