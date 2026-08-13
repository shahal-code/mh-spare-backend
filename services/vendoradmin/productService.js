import { Query } from "mongoose";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import { deleteCache, deleteCachePattern } from "../../utils/cacheHelper.js";
import { CACHE_KEYS } from "../../utils/cacheKeys.js";

// Invalidate all product-related caches
const invalidateProductCache = async (productId = null) => {
    await deleteCachePattern("shop:*");
    await deleteCache(CACHE_KEYS.LANDING_PRODUCTS);
    await deleteCachePattern("product:detail:*");
    if (productId) {
        await deleteCache(CACHE_KEYS.PRODUCT_DETAIL(productId));
    }
};

export const getCategories = async () => {
    return await Category.find({ is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
};

export const getProductOptions = async () => {
    return await Product.find({ is_unlisted: false, is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
};

export const getProductStats = async (admin) => {
    const activeProductsQuery = { is_blocked: false };
    const inactiveProductsQuery = { is_blocked: true };
    const pendingQuery = { approvalStatus: 'pending' };
    const approvedQuery = { approvalStatus: 'approved' };
    const rejectedQuery = { approvalStatus: 'rejected' };
    const outOfStockQuery = { 'variants.0.stock': { $lte: 0 } };
    const lowStockQuery = { 'variants.0.stock': { $gt: 0, $lte: 10 } };
    
    if (admin.role !== "owner") {
      activeProductsQuery.adminId = admin._id;
      inactiveProductsQuery.adminId = admin._id;
      pendingQuery.adminId = admin._id;
      approvedQuery.adminId = admin._id;
      rejectedQuery.adminId = admin._id;
      outOfStockQuery.adminId = admin._id;
      lowStockQuery.adminId = admin._id;
    }

    return {
      activeProductsCount: await Product.countDocuments(activeProductsQuery),
      inactiveProductsCount: await Product.countDocuments(inactiveProductsQuery),
      pendingCount: await Product.countDocuments(pendingQuery),
      approvedCount: await Product.countDocuments(approvedQuery),
      rejectedCount: await Product.countDocuments(rejectedQuery),
      outOfStockCount: await Product.countDocuments(outOfStockQuery),
      lowStockCount: await Product.countDocuments(lowStockQuery)
    };
};

export const bulkApproveProducts = async (data, admin) => {
    const { productIds, status, selectAll, search, statusFilter } = data;
    let query = {};
    if (selectAll) {
      if (search) query.name = { $regex: search, $options: "i" };
      if (statusFilter && statusFilter !== 'all') query.approvalStatus = statusFilter;
      if (admin.role !== "owner") query.adminId = admin._id;
    } else {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('No products selected');
      }
      query._id = { $in: productIds };
    }
    const result = await Product.updateMany(query, { $set: { approvalStatus: status } });
    await invalidateProductCache();
    return result;
};

export const bulkDeleteProducts = async (data, admin) => {
    const { productIds, selectAll, search, statusFilter, stockLevelFilter } = data;
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
      if (admin.role !== "owner") query.adminId = admin._id;
    } else {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('No products selected');
      }
      query._id = { $in: productIds };
    }
    const result = await Product.deleteMany(query);
    await invalidateProductCache();
    return result;
};

export const bulkToggleProducts = async (data, isBlocked, admin) => {
    const { productIds, selectAll, search, statusFilter, stockLevelFilter } = data;
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
      if (admin.role !== "owner") {
        query.adminId = admin._id;
        if (!isBlocked) {
          query.blockedBy = { $ne: 'superadmin' };
        }
      }
    } else {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('No products selected');
      }
      query._id = { $in: productIds };
      if (admin.role !== "owner" && !isBlocked) {
        query.blockedBy = { $ne: 'superadmin' };
      }
    }

    const updateObj = { is_blocked: isBlocked };
    if (isBlocked) {
      updateObj.blockedBy = admin.role === 'owner' ? 'superadmin' : 'vendor';
    } else {
      updateObj.blockedBy = null;
    }

    const result = await Product.updateMany(query, { $set: updateObj });
    await invalidateProductCache();
    return result;
};

// Get all products with pagination and category populate.
export const getAllProducts = async (query, page, limit, sortBy) => {
    let sortObj = { createdAt: -1 };
    if (sortBy === "price_asc") sortObj = { 'variants.price': 1 };
    else if (sortBy === "price_desc") sortObj = { 'variants.price': -1 };
    else if (sortBy === "stock_asc") sortObj = { 'variants.stock': 1 };
    else if (sortBy === "stock_desc") sortObj = { 'variants.stock': -1 };
    else if (sortBy === "name_asc") sortObj = { name: 1 };
    else if (sortBy === "name_desc") sortObj = { name: -1 };
    else if (sortBy === "oldest") sortObj = { createdAt: 1 };

    const products = await Product.find(query)
        .populate("category_id")
        .populate("adminId", "fullname email storeDetails")
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    return { products, totalProducts, totalPages };
};

export const quickEditProduct = async (id, { price, stock }) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    
    if (price !== undefined) {
      if (product.variants && product.variants.length > 0) {
        product.variants[0].price = Number(price);
      }
    }
    if (stock !== undefined) {
      if (product.variants && product.variants.length > 0) {
        product.variants[0].stock = Number(stock);
      }
    }
    const result = await product.save();
    await invalidateProductCache(id);
    return result;
};

export const getProductById = async (id) => {
    return await Product.findById(id).populate("category_id");
};

export const createProduct = async (productData) => {
    const { name, description, category_id, price, stock, adminId, approvalStatus, thumbnail, specifications } = productData;
    const images = Array.isArray(productData.images) ? productData.images : [];
    if (images.length < 3 || images.length > 5) {
        throw new Error("Please upload between 3 and 5 product images.");
    }
    let parsedSpecs = {};
    if (specifications) {
        try {
            parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
        } catch (e) {
            parsedSpecs = {};
        }
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const newProduct = new Product({
        name, description, category_id,
        slug,
        thumbnail: thumbnail || images[0],
        adminId, approvalStatus,
        specifications: parsedSpecs,
        variants: [{
            price: Number(price) || 0,
            stock: Number(stock) || 0,
            images,
            sku: slug + '-' + Date.now()
        }]
    });
    const result = await newProduct.save();
    await invalidateProductCache();
    return result;
};

export const updateProduct = async (id, updateData) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    if (updateData.name) {
        product.name = updateData.name;
        product.slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (updateData.description) product.description = updateData.description;
    if (updateData.category_id) product.category_id = updateData.category_id;
    if (updateData.thumbnail) product.thumbnail = updateData.thumbnail;

    if (updateData.specifications !== undefined) {
        try {
            product.specifications = typeof updateData.specifications === 'string' ? JSON.parse(updateData.specifications) : updateData.specifications;
        } catch (e) {
            // Keep existing specifications if parsing fails
        }
    }

    if (!product.variants || product.variants.length === 0) {
        product.variants = [{ sku: product.slug + '-' + Date.now() }];
    }
    const variant = product.variants[0];

    if (updateData.price !== undefined) variant.price = Number(updateData.price);
    if (updateData.stock !== undefined) variant.stock = Number(updateData.stock);

    let currentImages = variant.images ? [...variant.images] : [];
    // Include thumbnail in the pool of current images for legacy products that only saved a thumbnail
    if (product.thumbnail && !currentImages.includes(product.thumbnail)) {
        currentImages.push(product.thumbnail);
    }

    if (updateData.existingImages) {
        let existingToKeep = [];
        try {
            existingToKeep = JSON.parse(updateData.existingImages);
        } catch (e) {
            existingToKeep = Array.isArray(updateData.existingImages) ? updateData.existingImages : [updateData.existingImages];
        }
        currentImages = currentImages.filter(img => existingToKeep.includes(img));
    } else {
        currentImages = [];
    }

    if (updateData.images && updateData.images.length > 0) {
        currentImages = [...currentImages, ...updateData.images];
    }

    if (currentImages.length < 3 || currentImages.length > 5) {
        throw new Error("Product must have between 3 and 5 images.");
    }
    variant.images = currentImages;

    const result = await product.save();
    await invalidateProductCache(id);
    return result;
};

export const toggleProductStatus = async (id, adminUser = null) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");

    const isOwner = adminUser && adminUser.role === 'owner';
    const isVendor = adminUser && adminUser.role !== 'owner';

    // If vendor tries to unblock a product that was blocked by Super Admin
    if (isVendor && product.is_blocked && product.blockedBy === 'superadmin') {
        throw new Error("Permission denied. This product was blocked by Super Admin and cannot be unblocked by vendor. Please contact Super Admin.");
    }

    product.is_blocked = !product.is_blocked;
    if (product.is_blocked) {
        product.blockedBy = isOwner ? 'superadmin' : 'vendor';
    } else {
        product.blockedBy = null;
    }

    const result = await product.save();
    await invalidateProductCache(id);
    return result;
};

export const updateProductApproval = async (id, status) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    product.approvalStatus = status;
    const result = await product.save();
    await invalidateProductCache(id);
    return result;
};

export const deleteProduct = async (id) => {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new Error("Product not found");
    await invalidateProductCache(id);
    return product;
};

export const addVariant = async (productId, data, files) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");
    
    let images = [];
    if (files && files.images) {
        images = files.images.map(f => (f.location || f.path));
    }
    
    const newVariant = {
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        attributes: data.attributes ? JSON.parse(data.attributes) : {},
        images: images,
        is_blocked: data.is_blocked === 'true'
    };
    
    product.variants.push(newVariant);
    const result = await product.save();
    await invalidateProductCache(productId);
    return result;
};

export const updateVariant = async (productId, variantId, data, files) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");
    
    const variant = product.variants.id(variantId);
    if (!variant) throw new Error("Variant not found");
    
    if (data.name) variant.name = data.name;
    if (data.price) variant.price = Number(data.price);
    if (data.stock) variant.stock = Number(data.stock);
    if (data.attributes) variant.attributes = JSON.parse(data.attributes);
    if (data.is_blocked !== undefined) variant.is_blocked = data.is_blocked === 'true';
    
    let currentImages = variant.images || [];
    if (data.existingImages) {
        let existingToKeep = [];
        try {
            existingToKeep = JSON.parse(data.existingImages);
        } catch (e) {
            existingToKeep = Array.isArray(data.existingImages) ? data.existingImages : [data.existingImages];
        }
        currentImages = currentImages.filter(img => existingToKeep.includes(img));
    }
    
    if (files && files.images) {
        const newImages = files.images.map(f => (f.location || f.path));
        currentImages = [...currentImages, ...newImages];
    }
    
    variant.images = currentImages;
    const result = await product.save();
    await invalidateProductCache(productId);
    return result;
};

export const deleteVariant = async (productId, variantId) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");
    product.variants.pull({ _id: variantId });
    const result = await product.save();
    await invalidateProductCache(productId);
    return result;
};
