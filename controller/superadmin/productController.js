import * as ProductService from "../../services/superadmin/productService.js";
import ActivityLog from "../../models/activityLogModel.js";
import * as NotificationService from "../../services/superadmin/notificationService.js";

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const productOptions = async (req, res) => {
  try {
    const products = await ProductService.getProductOptions();
    res.json({ products });
  } catch (error) {
    sendError(res, error);
  }
};

export const products = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const stockLevel = req.query.stockLevel || "all";
    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    if (status !== 'all') {
      if (status === 'blocked') query.is_blocked = true;
      else if (status === 'active') query.is_blocked = false;
      else query.approvalStatus = status;
    }

    if (stockLevel !== 'all') {
      if (stockLevel === 'out_of_stock') {
        query['variants.0.stock'] = { $lte: 0 };
      } else if (stockLevel === 'low_stock') {
        query['variants.0.stock'] = { $gt: 0, $lte: 10 };
      } else if (stockLevel === 'in_stock') {
        query['variants.0.stock'] = { $gt: 10 };
      }
    }

    if (req.admin.role !== "owner") {
      query.adminId = req.admin._id;
    }

    const data = await ProductService.getAllProducts(query, page, limit);
    const stats = await ProductService.getProductStats(req.admin);
    
    res.json({ ...data, page, limit, search, ...stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const bulkApproveProducts = async (req, res) => {
  try {
    await ProductService.bulkApproveProducts(req.body, req.admin);
    res.json({ success: true, message: `Products marked as ${req.body.status}` });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    await ProductService.bulkDeleteProducts(req.body, req.admin);
    res.json({ success: true, message: "Products deleted successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkToggleProducts = async (req, res) => {
  try {
    const isBlocked = req.body.action === 'block';
    await ProductService.bulkToggleProducts(req.body, isBlocked, req.admin);
    res.json({ success: true, message: `Products ${isBlocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    sendError(res, error, 400);
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

export const quickEditProduct = async (req, res) => {
  try {
    const product = await ProductService.quickEditProduct(req.params.id, req.body);
    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    sendError(res, error);
  }
};

export const createProduct = async (req, res) => {
  try {
    const uploadedImages = req.files?.images?.map((file) => (file.location || file.path)) || [];
    const thumbnailFile = req.files?.thumbnail?.[0];
    const productData = {
      ...req.body,
      images: uploadedImages,
      thumbnail: (thumbnailFile?.location || thumbnailFile?.path) || uploadedImages[0] || req.body.thumbnail,
      adminId: req.admin._id,
      approvalStatus: req.admin.role === 'owner' ? 'approved' : 'pending'
    };
    const product = await ProductService.createProduct(productData);
    
    if (req.admin.role === 'vendor') {
      await ActivityLog.create({
        adminId: req.admin._id,
        role: 'vendor',
        action: `Added a new product: ${product.name}`,
        ipAddress: req.ip
      });
      await NotificationService.notifySuperAdmins('New Product Pending', `Vendor submitted product: ${product.name}`, 'product', `/superadmin/products`);
    }
    
    res.status(201).json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const uploadedImages = req.files?.images?.map((file) => (file.location || file.path)) || [];
    const thumbnailFile = req.files?.thumbnail?.[0];
    const product = await ProductService.updateProduct(req.params.id, {
      ...req.body,
      images: uploadedImages,
      thumbnail: (thumbnailFile?.location || thumbnailFile?.path) || uploadedImages[0] || req.body.thumbnail
    });

    if (req.admin.role === 'vendor') {
      await NotificationService.notifySuperAdmins('Product Updated', `Vendor updated product: ${product.name}`, 'product', `/superadmin/products`);
    }

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
    await NotificationService.notifyAdmin(product.adminId, `Product ${req.body.status}`, `Your product "${product.name}" has been ${req.body.status}.`, 'product', '/vendor/products');
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
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
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