import Wishlist from "../../models/wishlistModel.js";
import Product from "../../models/productModel.js";

// Helper to check product availability
const isProductAvailable = (product) => {
    if (!product) return false;
    if (product.is_blocked === true || product.is_unlisted === true) return false;
    if (product.approvalStatus && product.approvalStatus !== 'approved') return false;
    if (!product.category_id || product.category_id.is_blocked === true) return false;
    if (product.adminId && product.adminId.status === 'blocked') return false;
    return true;
};

// Fetch user's wishlist
export const getWishlist = async (userId) => {
    if (!userId) return { products: [] };

    let wishlist = await Wishlist.findOne({ userId })
        .populate({
            path: "products.productId",
            populate: [{ path: "category_id" }, { path: "adminId" }]
        })
        .lean();

    if (!wishlist) {
        wishlist = await Wishlist.create({ userId, products: [] });
        return wishlist;
    }

    wishlist.products.forEach(item => {
        if (!isProductAvailable(item.productId)) {
            item.isUnavailable = true;
        }
    });

    return wishlist;
};

// Toggle product in wishlist
export const toggleWishlist = async (userId, productId, variantId) => {
    // Check if product is available before adding to wishlist
    const product = await Product.findById(productId).populate('category_id').populate('adminId');
    if (!product) {
        throw new Error("Product not found");
    }
    if (!isProductAvailable(product)) {
        throw new Error("This product is currently unavailable and cannot be added to wishlist.");
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [{ productId, variantId }] });
        await wishlist.save();
        return { action: 'added', wishlist };
    }

    // Filter out old malformed entries if any exist
    wishlist.products = wishlist.products.filter(p => p && p.productId);

    const index = wishlist.products.findIndex(p => p.productId.toString() === productId && p.variantId.toString() === variantId);
    
    if (index === -1) {
        wishlist.products.push({ productId, variantId });
        await wishlist.save();
        return { action: 'added', wishlist };
    } else {
        wishlist.products.splice(index, 1);
        await wishlist.save();
        return { action: 'removed', wishlist };
    }
};

// Remove product from wishlist
export const removeFromWishlist = async (userId, productId, variantId) => {
    let wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
        wishlist.products = wishlist.products.filter(p => p && p.productId && !(p.productId.toString() === productId && p.variantId.toString() === variantId));
        await wishlist.save();
    }

    return wishlist;
};

// Fetch wishlist product IDs as an array
export const getWishlistProductIds = async (userId) => {
    if (!userId) return [];
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return [];
    
    return wishlist.products.map(p => p && p.productId ? p.productId.toString() : null).filter(Boolean);
};
