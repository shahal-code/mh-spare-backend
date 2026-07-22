import bcrypt from "bcryptjs";
import Coupon from "../../models/couponModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Order from "../../models/ordersModel.js";
import Product from "../../models/productModel.js";
import { validateLogin } from "../../utils/validation.js";
import Banner from "../../models/bannerModel.js";
import * as DashboardService from "../../services/admin/dashboardService.js";
import * as CustomerService from "../../services/admin/customerService.js";
import * as CategoryService from "../../services/admin/categoryService.js";
import * as ProductService from "../../services/admin/productService.js";
import * as OrderService from "../../services/admin/ordersService.js";
import CouponService from "../../services/admin/couponService.js";
import OfferService from "../../services/admin/offerService.js";
import * as ReportService from "../../services/admin/reportService.js";

import Admin from "../../models/adminModel.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

// Owner routes for vendor management
export const createVendor = async (req, res) => {
  try {
    const { fullname, email, password, storeName, phone, address } = req.body;

    if (!fullname || !email || !password || !storeName) {
      return res.status(400).json({ success: false, message: "Full name, email, password, and store name are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const existingVendor = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingVendor) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const vendor = await Admin.create({
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "vendor",
      status: "active",
      storeDetails: {
        storeName: storeName.trim(),
        phone: phone || "",
        address: address || "",
      },
    });

    const vendorData = vendor.toObject();
    delete vendorData.password;
    res.status(201).json({
      success: true,
      vendor: vendorData,
      credentials: { email: vendor.email, password },
      message: "Vendor account created successfully.",
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await Admin.find({ role: { $ne: 'owner' } }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, vendors });
  } catch (error) {
    sendError(res, error);
  }
};

export const resetVendorPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const vendor = await Admin.findOne({ _id: req.params.id, role: "vendor" });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const salt = await bcrypt.genSalt(10);
    vendor.password = await bcrypt.hash(password, salt);
    vendor.status = vendor.status === "blocked" ? "blocked" : "active";
    await vendor.save();

    res.json({
      success: true,
      credentials: { email: vendor.email, password },
      message: "Vendor password changed successfully.",
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const updateVendorPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const vendor = await Admin.findOne({ _id: req.params.id, role: "vendor" });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    if (!vendor.storeDetails) {
      vendor.storeDetails = {};
    }
    vendor.storeDetails.phone = phone;
    await vendor.save();

    res.json({
      success: true,
      message: "Vendor phone number updated successfully.",
      vendor
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};
export const approveVendor = async (req, res) => {
  try {
    const vendor = await Admin.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.status = 'active';
    await vendor.save();
    res.json({ success: true, vendor });
  } catch (error) {
    sendError(res, error);
  }
};

export const blockVendor = async (req, res) => {
  try {
    const vendor = await Admin.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.status = vendor.status === 'blocked' ? 'active' : 'blocked';
    await vendor.save();
    res.json({ success: true, vendor });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Admin.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    
    await Product.deleteMany({ adminId: vendor._id });
    await Admin.findByIdAndDelete(vendor._id);
    
    res.json({ success: true, message: 'Vendor and associated products deleted successfully' });
  } catch (error) {
    sendError(res, error);
  }
};

export const vendorStats = async (req, res) => {
  try {
    const validStatuses = ['Delivered', 'Shipped', 'Out for Delivery'];
    const vendorId = req.params.id;
    const vendor = await Admin.findById(vendorId).select("-password");
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const totalRevenueAggr = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $unwind: "$orderedItems" },
      { $match: { "orderedItems.adminId": vendor._id } },
      { $match: { "orderedItems.status": { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } } } }
    ]);
    const totalRevenue = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].total : 0;
    const totalProducts = await Product.countDocuments({ adminId: vendor._id });

    res.json({ success: true, vendor, totalRevenue, totalProducts });
  } catch (error) {
    sendError(res, error);
  }
};

export const vendorProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const vendorId = req.params.id;

    const query = { adminId: vendorId };
    const products = await Product.find(query)
      .populate("category_id")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(query);
    res.json({ success: true, products, totalProducts, totalPages: Math.ceil(totalProducts / limit), page, limit });
  } catch (error) {
    sendError(res, error);
  }
};

// Auth routes moved to admin.auth.js

export const dashboard = async (req, res) => {
  try {
    res.json(await DashboardService.getDashboardStats(req.admin));
  } catch (error) {
    sendError(res, error);
  }
};

export const dashboardChart = async (req, res) => {
  try {
    res.json(await DashboardService.getChartData(req.query.filter || "monthly", req.admin));
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
    const category = await CategoryService.createCategory({
      ...req.body,
      image: req.file?.path || req.file?.secure_url || req.body.image,
    });
    res.status(201).json({ success: true, category, message: "Category added successfully" });
  } catch (error) {
    sendError(res, error, error.message === "Category already exists" ? 400 : 500);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, {
      ...req.body,
      image: req.file?.path || req.file?.secure_url || req.body.image,
    });
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

    // Filter by admin if vendor
    if (req.admin.role !== "owner") {
      query.adminId = req.admin._id;
    }

    const data = await ProductService.getAllProducts(query, page, limit);

    const activeProductsQuery = { is_blocked: false };
    const inactiveProductsQuery = { is_blocked: true };
    if (req.admin.role !== "owner") {
      activeProductsQuery.adminId = req.admin._id;
      inactiveProductsQuery.adminId = req.admin._id;
    }

    const activeProductsCount = await Product.countDocuments(activeProductsQuery);
    const inactiveProductsCount = await Product.countDocuments(inactiveProductsQuery);
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
    const uploadedImages = req.files?.images?.map((file) => file.path) || [];
    const thumbnailFile = req.files?.thumbnail?.[0];
    const productData = {
      ...req.body,
      images: uploadedImages,
      thumbnail: thumbnailFile?.path || uploadedImages[0] || req.body.thumbnail,
      adminId: req.admin._id,
      approvalStatus: req.admin.role === 'owner' ? 'approved' : 'pending'
    };
    const product = await ProductService.createProduct(productData);
    res.status(201).json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const uploadedImages = req.files?.images?.map((file) => file.path) || [];
    const thumbnailFile = req.files?.thumbnail?.[0];
    const product = await ProductService.updateProduct(req.params.id, {
      ...req.body,
      images: uploadedImages,
      thumbnail: thumbnailFile?.path || uploadedImages[0] || req.body.thumbnail
    });
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

export const updateProductApproval = async (req, res) => {
  try {
    if (req.admin.role !== 'owner') {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const product = await ProductService.updateProductApproval(req.params.id, req.body.status);
    res.json({ success: true, product });
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
      endDate: new Date(endDate + "T23:59:59"),
      isActive: true,
      image: req.file?.path || req.file?.secure_url || req.body.image || null,
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
      endDate: new Date(endDate + "T23:59:59"),
      image: req.file?.path || req.file?.secure_url || req.body.image || existingOffer.image,
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

export const banners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, banners });
  } catch (error) {
    sendError(res, error);
  }
};

export const createBanner = async (req, res) => {
  try {
    const image = req.file?.path || req.file?.secure_url || req.body.image;
    if (!image) {
      return res.status(400).json({ success: false, message: "Banner image is required." });
    }
    const banner = await Banner.create({
      title: req.body.title || "",
      image,
      isActive: true,
      order: req.body.order || 0
    });
    res.status(201).json({ success: true, banner, message: "Banner created successfully!" });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const updateBanner = async (req, res) => {
  try {
    const bannerData = {
      title: req.body.title,
      order: req.body.order,
      isActive: req.body.isActive
    };
    if (req.file) {
      bannerData.image = req.file.path || req.file.secure_url;
    }
    const banner = await Banner.findByIdAndUpdate(req.params.id, bannerData, { new: true });
    res.json({ success: true, banner, message: "Banner updated successfully!" });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Banner deleted successfully." });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// --- BRANDS MANAGEMENT ---
export const brands = async (req, res) => {
  try {
    const Brand = (await import('../../models/brandModel.js')).default;
    const allBrands = await Brand.find().sort({ createdAt: -1 });
    res.json({ success: true, brands: allBrands });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const image = req.file?.path || req.file?.secure_url;
    
    if (!name || !image) {
      return res.status(400).json({ success: false, message: "Name and image are required" });
    }

    const Brand = (await import('../../models/brandModel.js')).default;
    const newBrand = new Brand({ name, image });
    await newBrand.save();
    
    res.status(201).json({ success: true, brand: newBrand });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const Brand = (await import('../../models/brandModel.js')).default;
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// --- PROFILE MANAGEMENT (SELF) ---
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
    
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    sendError(res, err);
  }
};

