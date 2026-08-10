import { Query } from "mongoose";
import Product from "../../models/productModel.js";

export const getProductOptions = async () => {
    return await Product.find({ is_unlisted: false, is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
};

export const getProductStats = async (admin) => {
    const activeProductsQuery = { is_blocked: false };
    const inactiveProductsQuery = { is_blocked: true };
    const pendingQuery = { approvalStatus: 'pending' };
    const approvedQuery = { approvalStatus: 'approved' };
    const rejectedQuery = { approvalStatus: 'rejected' };
    
    if (admin.role !== "owner") {
      activeProductsQuery.adminId = admin._id;
      inactiveProductsQuery.adminId = admin._id;
      pendingQuery.adminId = admin._id;
      approvedQuery.adminId = admin._id;
      rejectedQuery.adminId = admin._id;
    }

    return {
      activeProductsCount: await Product.countDocuments(activeProductsQuery),
      inactiveProductsCount: await Product.countDocuments(inactiveProductsQuery),
      pendingCount: await Product.countDocuments(pendingQuery),
      approvedCount: await Product.countDocuments(approvedQuery),
      rejectedCount: await Product.countDocuments(rejectedQuery)
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
    return await Product.updateMany(query, { $set: { approvalStatus: status } });
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
    return await Product.deleteMany(query);
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
      if (admin.role !== "owner") query.adminId = admin._id;
    } else {
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('No products selected');
      }
      query._id = { $in: productIds };
    }
    return await Product.updateMany(query, { $set: { is_blocked: isBlocked } });
};

// Get all products with pagination and category populate.
export const getAllProducts = async (query, page, limit) => {
    const products = await Product.find(query)
        .populate("category_id")
        .populate("adminId", "fullname email storeDetails")
        .sort({ createdAt: -1 })
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
    return await product.save();
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
        name, description, category_id, price: Number(price), stock: Number(stock),
        slug,
        images,
        thumbnail: thumbnail || images[0],
        adminId, approvalStatus,
        specifications: parsedSpecs
    });
    return await newProduct.save();
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
    if (updateData.price) product.price = Number(updateData.price);
    if (updateData.stock) product.stock = Number(updateData.stock);
    if (updateData.thumbnail) product.thumbnail = updateData.thumbnail;

    if (updateData.specifications !== undefined) {
        try {
            product.specifications = typeof updateData.specifications === 'string' ? JSON.parse(updateData.specifications) : updateData.specifications;
        } catch (e) {
            // Keep existing specifications if parsing fails
        }
    }

    let currentImages = product.images || [];
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
    product.images = currentImages;

    // Remove existing thumbnail logic handling from controller
    return await product.save();
};

export const toggleProductStatus = async (id) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    product.is_blocked = !product.is_blocked;
    return await product.save();
};

export const updateProductApproval = async (id, status) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    product.approvalStatus = status;
    return await product.save();
};

export const deleteProduct = async (id) => {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new Error("Product not found");
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
    return await product.save();
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
    return await product.save();
};

export const deleteVariant = async (productId, variantId) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");
    product.variants.pull({ _id: variantId });
    return await product.save();
};
