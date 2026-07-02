import * as cartService from "../../services/user/cartService.js";
import CouponService from "../../services/user/couponService.js";
import OrderService from "../../services/user/orderService.js";

// Render Cart Page
export const getCartView = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await cartService.getCart(userId);

        let subtotal = 0;
        if (cart && cart.items) {
            cart.items.forEach(item => {
                if (!item.isUnavailable) {
                    const product = item.productId;
                    if (product) {
                        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                        if (variant) {
                            subtotal += variant.price * item.quantity;
                        }
                    }
                }
            });
        }

        const tax = subtotal * 0.18; // 18% GST
        const total = subtotal + tax;

        res.render("user/cart/cart", {
            cart,
            subtotal,
            tax,
            total,
            user: req.session.user || null,
            path: "/user/cart"
        });
    } catch (error) {
        console.error("Cart Error:", error);
        res.status(500).send("Failed to load shopping cart");
    }
};

// API: Add Item
export const addItem = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to add items to cart",
                redirect: "/user/login"
            });
        }

        const { productId, variantId, quantity } = req.body;

        const cart = await cartService.addToCart(userId, productId, variantId, Number(quantity));
        res.status(200).json({ success: true, cart, message: "Item added to cart successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message, code: error.code || null });
    }
};

// API: Update Quantity
export const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        const { itemId, quantity } = req.body;

        const cart = await cartService.updateQuantity(userId, itemId, Number(quantity));

        // SECURITY: After quantity change, check if applied coupon is still valid
        let couponRemoved = false;
        let couponWarning = null;
        if (req.session.appliedCoupon) {
            const newTotal = await CouponService.getServerCartTotal(userId);
            if (newTotal < req.session.appliedCoupon.minPurchaseAmount) {
                couponWarning = `Coupon "${req.session.appliedCoupon.code}" removed: cart total dropped below the \u20b9${req.session.appliedCoupon.minPurchaseAmount} minimum.`;
                delete req.session.appliedCoupon;
                await new Promise((resolve) => req.session.save(resolve));
                couponRemoved = true;
            }
        }

        res.status(200).json({ success: true, cart, message: "Quantity updated", couponRemoved, couponWarning });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API: Remove Item
export const removeItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { itemId } = req.body;

        const cart = await cartService.removeItem(userId, itemId);

        // SECURITY: After removal, immediately check if applied coupon is still valid.
        // This is the primary fix for the "apply coupon → remove item" scam.
        let couponRemoved = false;
        let couponWarning = null;
        if (req.session.appliedCoupon) {
            const newTotal = await CouponService.getServerCartTotal(userId);
            if (newTotal < req.session.appliedCoupon.minPurchaseAmount) {
                couponWarning = `Coupon "${req.session.appliedCoupon.code}" removed: cart total dropped below the \u20b9${req.session.appliedCoupon.minPurchaseAmount} minimum.`;
                delete req.session.appliedCoupon;
                await new Promise((resolve) => req.session.save(resolve));
                couponRemoved = true;
            }
        }

        res.status(200).json({ success: true, cart, message: "Item removed from cart", couponRemoved, couponWarning });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API: Validate Checkout
export const validateCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const { expectedTotal } = req.body;

        const { finalAmount } = await OrderService.validateCartAndBuildOrder(userId, req.session.appliedCoupon);

        const expected = Math.round(Number(expectedTotal));
        const final = Math.round(Number(finalAmount));

        if (expected !== final) {
            let message = "An offer has expired or prices have changed. The cart will be updated to reflect the new prices.";
            let title = "Price Updated";
            let icon = "warning";

            if (final < expected) {
                message = "Great news! A new offer just became available for your items. Your cart total has decreased!";
                title = "Offer Applied!";
                icon = "success";
            }

            return res.status(400).json({ success: false, message, title, icon });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || "Cart validation failed." });
    }
};

