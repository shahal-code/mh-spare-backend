import * as cartService from "../../services/user/cartService.js";
import CouponService from "../../services/user/couponService.js";
import OrderService from "../../services/user/orderService.js";

// Get Cart (JSON API)
export const getCartView = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await cartService.getCart(userId);

        let subtotal = 0;
        if (cart && cart.items) {
            cart.items.forEach(item => {
                if (!item.isUnavailable) {
                    const product = item.productId;
                    if (product) {
                        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                        if (variant) {
                            const unitPrice = cartService.calculateItemUnitPrice(product, variant, item.quantity);
                            subtotal += unitPrice * item.quantity;
                        }
                    }
                }
            });
        }

        const tax = subtotal * 0.18; // 18% GST
        const total = subtotal + tax;

        res.json({
            success: true,
            cart,
            subtotal,
            tax,
            total
        });
    } catch (error) {
        console.error("Cart Error:", error);
        res.status(500).json({ success: false, message: "Failed to load shopping cart" });
    }
};

// API: Add Item
export const addItem = async (req, res) => {
    try {
        const userId = req.user._id;

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
        const userId = req.user._id;
        const { itemId, quantity } = req.body;

        const cart = await cartService.updateQuantity(userId, itemId, Number(quantity));

        res.status(200).json({ success: true, cart, message: "Quantity updated" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API: Remove Item
export const removeItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemId } = req.body;

        const cart = await cartService.removeItem(userId, itemId);

        res.status(200).json({ success: true, cart, message: "Item removed from cart" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API: Validate Checkout
export const validateCheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        const { expectedTotal } = req.body;

        const { finalAmount } = await OrderService.validateCartAndBuildOrder(userId, null);

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

