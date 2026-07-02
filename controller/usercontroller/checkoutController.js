import * as AddressService from "../../services/user/addressService.js";
import * as CartService from "../../services/user/cartService.js";
import OrderService from "../../services/user/orderService.js";
import * as PaymentService from "../../services/user/paymentServices.js";
import CouponService from "../../services/user/couponService.js";

/**
 * Render Checkout Page
 */
export const getCheckoutView = async (req, res) => {
    try {
        const userId = req.session.user;

        const [addresses, cart] = await Promise.all([
            AddressService.getAddressesByUserId(userId),
            CartService.getCart(userId)
        ]);

        if (!cart) {
            return res.redirect('/user/cart');
        }

        // Calculate totals while preserving unavailable items in the checkout view
        let subtotal = 0;
        let unavailableNames = [];
        let hasAvailableItems = false;

        cart.items.forEach(item => {
            const product = item.productId;
            const category = product?.category_id;
            
            const isBlocked = !product || product.is_blocked || (category && category.is_blocked);
            
            if (isBlocked) {
                item.isUnavailable = true;
                if (product?.name) unavailableNames.push(product.name);
                return;
            }
            
            const variant = product?.variants?.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
                subtotal += variant.price * item.quantity;
                hasAvailableItems = true;
                return;
            }
            
            item.isUnavailable = true;
            if (product?.name) unavailableNames.push(product.name);
        });

        if (!hasAvailableItems) {
            return res.redirect('/user/cart');
        }

        const tax = subtotal * 0.18;
        let total = subtotal + tax;
        let discount = 0;
        let appliedCoupon = req.session.appliedCoupon;
        let couponWarning = null;

        // Re-validate coupon on every page load to catch cart-manipulation scams
        if (appliedCoupon) {
            if (total >= appliedCoupon.minPurchaseAmount) {
                discount = CouponService.calculateDiscount(appliedCoupon, total);
                total = total - discount;
                if (total < 0) total = 0;
            } else {
                // Cart total dropped below the minimum — auto-remove and warn the user
                couponWarning = `Coupon "${appliedCoupon.code}" removed: cart total is below the ₹${appliedCoupon.minPurchaseAmount} minimum required.`;
                delete req.session.appliedCoupon;
                appliedCoupon = null;
            }
        }

        const availableCoupons = await CouponService.getApplicableCoupons(userId, subtotal + tax);

        res.render('user/checkout/checkout', {
            user: res.locals.user || req.user,
            addresses,
            cart,
            subtotal,
            tax,
            discount,
            total,
            appliedCoupon,
            availableCoupons,
            couponWarning,
            unavailableNames,
            path: '/user/checkout',
            razorpayKey: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Checkout Page Error:", error);
        res.status(500).redirect('/user/cart');
    }
};


//  Process Order Placement

export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const {
            addressId,
            paymentMethod,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            expectedTotal
        } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const address = await AddressService.getAddressById(addressId);
        if (!address) {
            return res.status(400).json({ success: false, message: "Selected address is invalid." });
        }

        if (paymentMethod === "UPI") {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: "Payment verification details are required." });
            }

            const isPaymentValid = PaymentService.verifyRazorpaySignature({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature
            });

            if (!isPaymentValid) {
                return res.status(400).json({ success: false, message: "Payment verification failed." });
            }
        }

        // Use the service to handle logic
        const order = await OrderService.createOrder(userId, address, paymentMethod, false, req.session.appliedCoupon, expectedTotal);

        // If success, clear session
        if (req.session.appliedCoupon) {
            delete req.session.appliedCoupon;
            await new Promise((resolve) => req.session.save(resolve));
        }

        res.json({
            success: true,
            message: "Order placed successfully!",
            redirectUrl: `/user/checkout/order-success?id=${order.orderId}`
        });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to place order. Please try again."
        });
    }
};

/**
 * Render Order Success Page
 */
export const getOrderSuccessView = async (req, res) => {
    try {
        const orderId = req.query.id;
        if (!orderId) return res.redirect('/user/shop');
        
        res.render('user/checkout/orderSuccess', { 
            orderId,
            path: '/user/checkout/order-success'
        });
    } catch (error) {
        console.error("Order Success Page Error:", error);
        res.redirect('/user/shop');
    }
};

/**
 * Reject failed payment order creation
 */
export const placeOrderFailed = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod, expectedTotal } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const address = await AddressService.getAddressById(addressId);
        if (!address) {
            return res.status(400).json({ success: false, message: "Selected address is invalid." });
        }

        // Create order with paymentFailed = true
        const order = await OrderService.createOrder(userId, address, paymentMethod, true, req.session.appliedCoupon, expectedTotal);

        // If success, clear session coupon so it isn't hanging around
        if (req.session.appliedCoupon) {
            delete req.session.appliedCoupon;
            await new Promise((resolve) => req.session.save(resolve));
        }

        return res.json({
            success: true,
            orderId: order.orderId,
            message: "Payment was not completed. Order saved with Failed status."
        });

    } catch (error) {
        console.error("Failed Order Placement Error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to process order failure."
        });
    }
};

/**
 * Render Payment Failure Page
 */
export const getPaymentFailureView = async (req, res) => {
    try {
        const orderId = req.query.id;
        const userId = req.session.user;

        if (!orderId) {
            return res.render('user/checkout/paymentFailure', {
                orderId: null,
                order: null,
                user: res.locals.user || req.user,
                razorpayKey: process.env.RAZORPAY_KEY_ID,
                path: '/user/checkout/payment-failure'
            });
        }
        
        const order = await OrderService.getOrderByDisplayId(orderId, userId);
        if (!order) return res.redirect('/user/shop');

        res.render('user/checkout/paymentFailure', { 
            orderId,
            order,
            user: res.locals.user || req.user,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            path: '/user/checkout/payment-failure'
        });
    } catch (error) {
        console.error("Payment Failure Page Error:", error);
        res.redirect('/user/shop');
    }
};

/**
 * Handle Retry Payment
 */
export const retryOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing required verification fields." });
        }

        const isPaymentValid = PaymentService.verifyRazorpaySignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        });

        if (!isPaymentValid) {
            return res.status(400).json({ success: false, message: "Payment verification failed." });
        }

        await OrderService.finalizeFailedOrderPayment(orderId, userId);

        res.json({
            success: true,
            message: "Payment successful!",
            redirectUrl: `/user/checkout/order-success?id=${orderId}`
        });
    } catch (error) {
        console.error("Retry Order Error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update payment status."
        });
    }
};

/**
 * Apply Coupon
 * NOTE: We deliberately ignore any cartTotal from the client and compute it
 * server-side to prevent users from sending a fake inflated value.
 */
export const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;          // cartTotal from client is intentionally ignored
        const userId = req.session.user;
        const normalizedCode = code ? code.trim().toUpperCase() : "";

        if (!normalizedCode) {
            return res.status(400).json({ success: false, message: "Please enter a coupon code." });
        }

        if (req.session.appliedCoupon?.code === normalizedCode) {
            return res.status(400).json({ success: false, message: "This coupon is already applied." });
        }

        // Always compute cart total on the server — never trust the client
        const serverCartTotal = await CouponService.getServerCartTotal(userId);

        const coupon = await CouponService.validateCoupon(normalizedCode, userId, serverCartTotal);

        req.session.appliedCoupon = coupon;
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        res.json({ success: true, message: "Coupon applied successfully!" });
    } catch (error) {
        console.error("Apply Coupon Error:", error);
        res.status(400).json({ success: false, message: error.message || "Failed to apply coupon." });
    }
};

/**
 * Remove Coupon
 */
export const removeCoupon = async (req, res) => {
    try {
        delete req.session.appliedCoupon;
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        res.json({ success: true, message: "Coupon removed successfully!" });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to remove coupon." });
    }
};
