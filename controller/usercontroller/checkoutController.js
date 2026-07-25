import * as AddressService from "../../services/user/addressService.js";
import * as CartService from "../../services/user/cartService.js";
import OrderService from "../../services/user/orderService.js";
import * as PaymentService from "../../services/user/paymentServices.js";
import CouponService from "../../services/user/couponService.js";

/**
 * Get Checkout Summary (JSON API)
 */
export const getCheckoutView = async (req, res) => {
    try {
        const userId = req.user._id;
        const requestedCouponCode = req.query.couponCode;

        const [addresses, cart] = await Promise.all([
            AddressService.getAddressesByUserId(userId),
            CartService.getCart(userId)
        ]);

        if (!cart || cart.items.length === 0) {
            return res.json({ success: false, redirectUrl: '/cart', message: "Cart is empty" });
        }

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
            return res.json({ success: false, redirectUrl: '/cart', message: "No available items in cart" });
        }

        const tax = subtotal * 0.18;
        let total = subtotal + tax;
        let discount = 0;
        let appliedCoupon = null;
        let couponWarning = null;

        // Process coupon dynamically if provided by frontend
        if (requestedCouponCode) {
            try {
                const coupon = await CouponService.validateCoupon(requestedCouponCode.trim().toUpperCase(), userId, total);
                if (total >= coupon.minPurchaseAmount) {
                    appliedCoupon = coupon;
                    discount = CouponService.calculateDiscount(coupon, total);
                    total = total - discount;
                    if (total < 0) total = 0;
                } else {
                    couponWarning = `Coupon "${coupon.code}" removed: cart total is below the ₹${coupon.minPurchaseAmount} minimum required.`;
                }
            } catch (err) {
                couponWarning = err.message || "Invalid or expired coupon.";
            }
        }

        const availableCoupons = await CouponService.getApplicableCoupons(userId, subtotal + tax);

        return res.json({
            success: true,
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
            razorpayKey: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Checkout Summary Error:", error);
        res.status(500).json({ success: false, message: "Failed to load checkout summary" });
    }
};


//  Process Order Placement
export const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            addressId,
            paymentMethod,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            expectedTotal,
            couponCode
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

        let appliedCoupon = null;
        if (couponCode) {
            const serverCartTotal = await CouponService.getServerCartTotal(userId);
            appliedCoupon = await CouponService.validateCoupon(couponCode, userId, serverCartTotal);
        }

        // Use the service to handle logic
        const order = await OrderService.createOrder(userId, address, paymentMethod, false, appliedCoupon, expectedTotal);

        try {
            const { notifySuperAdmins, notifyAdmin } = await import('../../services/superadmin/notificationService.js');
            const { sendVendorOrderEmail } = await import('../../config/nodemailer.js');
            const Admin = (await import('../../models/adminModel.js')).default;
            const Product = (await import('../../models/productModel.js')).default;

            await notifySuperAdmins('New Order Received', `Order #${order.orderId} placed for ₹${order.finalAmount}`, 'order', `/superadmin/orders`);
            
            // Group items by vendor
            const vendorItemsMap = {};
            for (const item of order.orderedItems) {
                if (item.adminId) {
                    const vId = item.adminId._id ? item.adminId._id.toString() : item.adminId.toString();
                    if (!vendorItemsMap[vId]) vendorItemsMap[vId] = [];
                    vendorItemsMap[vId].push(item);
                }
            }

            for (const [vId, items] of Object.entries(vendorItemsMap)) {
                // 1. Send in-app SSE notification to the vendor
                await notifyAdmin(vId, 'New Order Received', `You have new items to fulfill in Order #${order.orderId}`, 'order', `/vendor/orders`);
                
                // 2. Send email to the vendor
                const vendor = await Admin.findById(vId).select('email fullname');
                if (vendor && vendor.email) {
                    // Populate product names for these items for the email
                    const populatedItems = await Promise.all(items.map(async (it) => {
                        const product = await Product.findById(it.product).select('name');
                        return { 
                            ...it.toObject ? it.toObject() : it, 
                            productName: product ? product.name : 'Product' 
                        };
                    }));
                    await sendVendorOrderEmail(vendor.email, vendor.fullname || 'Vendor', order, populatedItems);
                }
            }
        } catch (err) {
            console.error("Notification/Email Error:", err);
        }

        res.json({
            success: true,
            message: "Order placed successfully!",
            orderId: order.orderId,
            redirectUrl: `/checkout/order-success?id=${order.orderId}`
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
 * Reject failed payment order creation
 */
export const placeOrderFailed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { addressId, paymentMethod, expectedTotal, couponCode } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const address = await AddressService.getAddressById(addressId);
        if (!address) {
            return res.status(400).json({ success: false, message: "Selected address is invalid." });
        }

        let appliedCoupon = null;
        if (couponCode) {
            const serverCartTotal = await CouponService.getServerCartTotal(userId);
            appliedCoupon = await CouponService.validateCoupon(couponCode, userId, serverCartTotal);
        }

        // Create order with paymentFailed = true
        const order = await OrderService.createOrder(userId, address, paymentMethod, true, appliedCoupon, expectedTotal);

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
 * Handle Retry Payment
 */
export const retryOrder = async (req, res) => {
    try {
        const userId = req.user._id;
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
            redirectUrl: `/checkout/order-success?id=${orderId}`
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
 */
export const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user._id;
        const normalizedCode = code ? code.trim().toUpperCase() : "";

        if (!normalizedCode) {
            return res.status(400).json({ success: false, message: "Please enter a coupon code." });
        }

        const serverCartTotal = await CouponService.getServerCartTotal(userId);
        const coupon = await CouponService.validateCoupon(normalizedCode, userId, serverCartTotal);

        res.json({ success: true, message: "Coupon applied successfully!", coupon });
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
        // Since React state manages the applied coupon, the backend doesn't need to do anything
        res.json({ success: true, message: "Coupon removed successfully!" });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to remove coupon." });
    }
};
