import { Query } from "mongoose";
import Product from "../../models/productModel.js";


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

    return {
        products,
        totalProducts,
        totalPages
    };
};




/**
 * Get product by ID with populated category.
 */
export const getProductById = async (id) => {
    return await Product.findById(id).populate("category_id");
};

/**
 * Create a new base product.
 */
export const createProduct = async (productData) => {
    const { name, description, category_id, price, adminId, approvalStatus } = productData;

    const newProduct = new Product({
        name,
        description,
        category_id,
        adminId,
        approvalStatus: approvalStatus || 'pending',
        variants: price ? [{
            price: parseFloat(price),
            sku: `SKU-${Date.now()}`,
            images: [], // Images will be added in Manage Variants
            stock: 0
        }] : []
    });

    return await newProduct.save();
};

/**
 * Add a variant to an existing product.
 */
export const addVariant = async (productId, variantData, files) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const images = files ? files.map(file => file.path) : [];
    if (images.length < 3) throw new Error("Please upload at least 3 images for the variant.");

    const newVariant = {
        ...variantData,
        processorBrand: variantData.processorBrand,
        images,
        sku: variantData.sku || "SKU-" + Date.now()
    };

    product.variants.push(newVariant);
    return await product.save();
};

/**
 * Update a specific variant.
 */
export const updateVariant = async (productId, variantId, variantData, files) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
    if (variantIndex === -1) throw new Error("Variant not found");

    let images = product.variants[variantIndex].images;

    // Handle image removal
    if (variantData.removedImages) {
        const removed = Array.isArray(variantData.removedImages) ? variantData.removedImages : [variantData.removedImages];
        console.log("Existing Images:", images);
        console.log("Images to Remove:", removed);
        images = images.filter(img => !removed.includes(img));
    }

    // Add new images
    if (files && files.length > 0) {
        images = images.concat(files.map(f => f.path));
    }

    if (images.length < 3) throw new Error("Variant must have at least 3 images.");

    product.variants[variantIndex] = {
        ...product.variants[variantIndex].toObject(),
        ...variantData,
        processorBrand: variantData.processorBrand || product.variants[variantIndex].processorBrand,
        images
    };

    return await product.save();
};

/**
 * Delete a specific variant.
 */
export const deleteVariant = async (productId, variantId) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    product.variants = product.variants.filter(v => v._id.toString() !== variantId);
    return await product.save();
};

/**
 * Update an existing base product info.
 */
export const updateProduct = async (id, productData) => {
    const { name, description, category_id, display, battery, price } = productData;

    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");

    product.name = name;
    product.description = description;
    product.category_id = category_id;

    // Update specifications
    product.specifications = {
        display,
        battery,
        weight: product.specifications?.weight,
        os: product.specifications?.os
    };

    // Update primary variant price if it exists
    if (price && product.variants.length > 0) {
        product.variants[0].price = parseFloat(price);
    }

    return await product.save();
};

/**
 * Delete a product.
 */
export const deleteProduct = async (id) => {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) throw new Error("Product not found");
    return deletedProduct;
};

/**
 * Toggle product block status.
 */
export const toggleProductStatus = async (id) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");

    product.is_blocked = !product.is_blocked;
    return await product.save();
};

/**
 * Update product approval status (Super Admin only).
 */
export const updateProductApproval = async (id, status) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");
    
    product.approvalStatus = status;
    return await product.save();
};





