import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import { applyOffers } from "./productServices.js";

// Helper to check product availability
const isProductAvailable = (product) => {
    if (!product) return false;
    if (product.is_blocked === true || product.is_unlisted === true) return false;
    if (product.approvalStatus && product.approvalStatus !== 'approved') return false;
    if (!product.category_id || product.category_id.is_blocked === true) return false;
    if (product.adminId && product.adminId.status === 'blocked') return false;
    return true;
};

// Fetch user's cart
export const getCart = async (userId) => {
    if (!userId) return { items: [] };

    let cart = await Cart.findOne({ userId })
        .populate({
            path: "items.productId",
            populate: [{ path: "category_id" }, { path: "adminId" }]
        })
        .lean();

    if (!cart) {
        cart = await Cart.create({ userId, items: [] });
        return cart;
    }

    // Flag unavailable items instead of silently removing them
    const productsToApply = [];
    cart.items.forEach(item => {
        if (!isProductAvailable(item.productId)) {
            item.isUnavailable = true;
        } else {
            productsToApply.push(item.productId);
        }
    });

    if (productsToApply.length > 0) {
        await applyOffers(productsToApply);
    }
    return cart;
};

export const calculateItemUnitPrice = (product, variant, quantity) => {
    let price = Number(variant?.price || 0);

    if (product?.offer && product.offer.discountedPrice) {
        price = Number(product.offer.discountedPrice);
    }

    if (product?.wholesaleTiers && Array.isArray(product.wholesaleTiers) && product.wholesaleTiers.length > 0) {
        const sorted = [...product.wholesaleTiers]
            .map(t => ({ minQty: Number(t.minQty || t.minQuantity || 0), price: Number(t.price || 0) }))
            .filter(t => t.minQty > 0 && t.price > 0)
            .sort((a, b) => b.minQty - a.minQty);

        const activeTier = sorted.find(t => quantity >= t.minQty);
        if (activeTier) {
            price = activeTier.price;
        }
    }

    return price;
};

// Add item to cart
export const addToCart = async (userId, productId, variantId, quantity = 1) => {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = new Cart({ userId, items: [] });
    }

    // Check if product exists and is available
    const product = await Product.findById(productId).populate('category_id').populate('adminId');
    if (!product) throw new Error("Product not found");
    if (!isProductAvailable(product)) {
        throw new Error("This product is no longer available and cannot be added to cart.");
    }

    const variant = product.variants.id(variantId);
    if (!variant || variant.is_blocked) throw new Error("This product variant is no longer available.");

    if (variant.stock <= 0) {
        throw new Error("Product is out of stock");
    }

    if (variant.stock < quantity) {
        throw new Error(`Only ${variant.stock} items left in stock`);
    }

    // Check if already in cart
    const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId && item.variantId.toString() === variantId
    );

    if (existingItemIndex > -1) {
        let totalQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Cap at stock
        if (totalQuantity > variant.stock) {
            totalQuantity = variant.stock;
        }
        
        cart.items[existingItemIndex].quantity = totalQuantity;
    } else {
        cart.items.push({
            productId,
            variantId,
            quantity
        });
    }

    await cart.save();
    return cart;
};

// Update item quantity
export const updateQuantity = async (userId, itemId, newQuantity) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    const item = cart.items.id(itemId);
    if (!item) throw new Error("Item not found in cart");

    const product = await Product.findById(item.productId).populate('category_id').populate('adminId');
    if (!isProductAvailable(product)) {
        throw new Error("This product is no longer available.");
    }
    const variant = product.variants.id(item.variantId);
    if (!variant || variant.is_blocked) throw new Error("This product variant is no longer available.");

    if (newQuantity > variant.stock) {
        throw new Error(`Only ${variant.stock} items left in stock`);
    }

    item.quantity = newQuantity;
    await cart.save();
    return await Cart.findOne({ userId }).populate('items.productId');
};

// Remove item from cart
export const removeItem = async (userId, itemId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();
    return await Cart.findOne({ userId }).populate('items.productId');
};
