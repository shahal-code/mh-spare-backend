import * as ProductService from "../../services/vendoradmin/productService.js";
import ActivityLog from "../../models/activityLogModel.js";
import * as NotificationService from "../../services/vendoradmin/notificationService.js";
import Product from "../../models/productModel.js";

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
    const category = req.query.category || "all";
    const priceRange = req.query.priceRange || "all";
    const dateAdded = req.query.dateAdded || "all";
    const sortBy = req.query.sortBy || "newest";

    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    if (category !== "all") {
      query.category_id = category;
    }

    if (priceRange !== "all") {
      if (priceRange === "under_500") query['variants.0.price'] = { $lt: 500 };
      else if (priceRange === "500_2000") query['variants.0.price'] = { $gte: 500, $lte: 2000 };
      else if (priceRange === "above_2000") query['variants.0.price'] = { $gt: 2000 };
    }

    if (dateAdded !== "all") {
      const now = new Date();
      if (dateAdded === "today") {
        query.createdAt = { $gte: new Date(now.setHours(0,0,0,0)) };
      } else if (dateAdded === "this_week") {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0,0,0,0);
        query.createdAt = { $gte: startOfWeek };
      } else if (dateAdded === "this_month") {
        query.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      }
    }

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

    const data = await ProductService.getAllProducts(query, page, limit, sortBy);
    const stats = await ProductService.getProductStats(req.admin);
    const categories = await ProductService.getCategories();
    
    res.json({ ...data, page, limit, search, ...stats, categories });
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
    const { productIds, selectAll, search, statusFilter, stockLevelFilter } = req.body;
    let query = {};
    if (selectAll) {
      if (search) query.name = { $regex: search, $options: "i" };
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'blocked') query.is_blocked = true;
        else if (statusFilter === 'active') query.is_blocked = false;
        else query.approvalStatus = statusFilter;
      }
      if (stockLevelFilter && stockLevelFilter !== 'all') {
        if (stockLevelFilter === 'out_of_stock') query['variants.0.stock'] = { $lte: 0 };
        else if (stockLevelFilter === 'low_stock') query['variants.0.stock'] = { $gt: 0, $lte: 10 };
        else if (stockLevelFilter === 'in_stock') query['variants.0.stock'] = { $gt: 10 };
      }
      if (req.admin.role !== "owner") query.adminId = req.admin._id;
    } else {
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        query._id = { $in: productIds };
      }
    }

    const productsToDelete = await Product.find(query).select("name").lean();
    await ProductService.bulkDeleteProducts(req.body, req.admin);

    if (req.admin.role !== 'owner' && productsToDelete.length > 0) {
      const names = productsToDelete.map(p => p.name);
      let message = "";
      let title = "Product Deleted";

      if (names.length === 1) {
        title = "Product Deleted";
        message = `Vendor deleted product: ${names[0]}`;
      } else {
        title = "Products Deleted";
        const displayNames = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
        message = `Vendor deleted ${names.length} products: ${displayNames}`;
      }

      await NotificationService.notifySuperAdmins(
        title,
        message,
        'product',
        '/superadmin/products'
      );
    }
    res.json({ success: true, message: "Products deleted successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkToggleProducts = async (req, res) => {
  try {
    const isBlocked = req.body.action === 'block';
    const { productIds, selectAll, search, statusFilter, stockLevelFilter } = req.body;
    let query = {};
    if (selectAll) {
      if (search) query.name = { $regex: search, $options: "i" };
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'blocked') query.is_blocked = true;
        else if (statusFilter === 'active') query.is_blocked = false;
        else query.approvalStatus = statusFilter;
      }
      if (stockLevelFilter && stockLevelFilter !== 'all') {
        if (stockLevelFilter === 'out_of_stock') query['variants.0.stock'] = { $lte: 0 };
        else if (stockLevelFilter === 'low_stock') query['variants.0.stock'] = { $gt: 0, $lte: 10 };
        else if (stockLevelFilter === 'in_stock') query['variants.0.stock'] = { $gt: 10 };
      }
      if (req.admin.role !== "owner") query.adminId = req.admin._id;
    } else {
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        query._id = { $in: productIds };
      }
    }

    const productsToToggle = await Product.find(query).select("name").lean();
    await ProductService.bulkToggleProducts(req.body, isBlocked, req.admin);

    if (req.admin.role !== 'owner' && productsToToggle.length > 0) {
      const actionText = isBlocked ? 'blocked' : 'unblocked';
      const names = productsToToggle.map(p => p.name);
      
      let message = "";
      let title = `Product ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;

      if (names.length === 1) {
        message = `Vendor ${actionText} product: ${names[0]}`;
      } else {
        title = `Products ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
        const displayNames = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
        message = `Vendor ${actionText} ${names.length} products: ${displayNames}`;
      }

      await NotificationService.notifySuperAdmins(
        title,
        message,
        'product',
        '/superadmin/products'
      );
    }
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
    
    if (req.admin.role !== 'owner') {
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

    if (req.admin.role !== 'owner') {
      await NotificationService.notifySuperAdmins('Product Updated', `Vendor updated product: ${product.name}`, 'product', `/superadmin/products`);
    }

    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await ProductService.toggleProductStatus(req.params.id, req.admin);
    if (req.admin.role !== 'owner') {
      const statusText = product.is_blocked ? 'blocked' : 'unblocked';
      await NotificationService.notifySuperAdmins(
        `Product ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        `Vendor ${statusText} product: ${product.name}`,
        'product',
        `/superadmin/products`
      );
    }
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
    const productToDelete = await ProductService.getProductById(req.params.id);
    await ProductService.deleteProduct(req.params.id);
    if (req.admin.role !== 'owner' && productToDelete) {
      await NotificationService.notifySuperAdmins(
        'Product Deleted',
        `Vendor deleted product: ${productToDelete.name}`,
        'product',
        `/superadmin/products`
      );
    }
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
