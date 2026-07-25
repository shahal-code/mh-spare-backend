import * as wishlistService from "../../services/user/wishlistServices.js";



// API: Toggle Wishlist
export const toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to manage wishlist" });
        }

        const { productId, variantId } = req.body;
        if (!variantId) {
            return res.status(400).json({ success: false, message: "Variant ID is required" });
        }

        const result = await wishlistService.toggleWishlist(userId, productId, variantId);
        const wishlistCount = result.wishlist.products.length;
        res.status(200).json({
            success: true,
            action: result.action,
            message: result.action === 'added' ? "Added to wishlist" : "Removed from wishlist",
            wishlistCount
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API: Remove from Wishlist
export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, variantId } = req.body;
        const wishlist = await wishlistService.removeFromWishlist(userId, productId, variantId);
        const wishlistCount = wishlist ? wishlist.products.length : 0;
        res.status(200).json({ success: true, message: "Removed from wishlist", wishlistCount });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
