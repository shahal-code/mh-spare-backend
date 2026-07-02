import Cart from "../../models/cartModel.js";
import * as paymentService from "../../services/user/paymentServices.js";
import OrderService from "../../services/user/orderService.js";

export const createOrder = async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    const userId = req.session.user;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    if (orderId) {
        const existingOrder = await OrderService.getOrderByDisplayId(orderId, userId);
        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        if (existingOrder.status !== 'Pending') {
            return res.status(400).json({ success: false, message: "Only pending failed orders can be retried." });
        }
        if (existingOrder.paymentStatus !== 'Failed' && !(existingOrder.paymentStatus === 'Pending' && existingOrder.inventoryProcessed === false)) {
            return res.status(400).json({ success: false, message: "This order cannot be retried." });
        }
        if (Number(existingOrder.finalAmount) !== Number(amount)) {
            return res.status(400).json({ success: false, message: "Order amount mismatch. Please reload and try again." });
        }
    } else {
        // Pre-flight check: validate the cart and recalculate price
        try {
            const { finalAmount } = await OrderService.validateCartAndBuildOrder(userId, req.session.appliedCoupon);

            const expected = Math.round(Number(amount));
            const final = Math.round(Number(finalAmount));
            if (expected !== final) {
                let message = "The order total has changed due to expired offers or price updates. Please refresh the checkout page to see the new total.";
                if (final < expected) {
                    message = "Great news! A new offer was just applied to your cart, reducing your total. Please refresh the checkout page to place your order at the new lower price!";
                }
                return res.status(400).json({ success: false, message });
            }
        } catch (validationError) {
            return res.status(400).json({ success: false, message: validationError.message || "Cart validation failed. Please refresh the page." });
        }
    }

    const order = await paymentService.createRazorpayOrder(amount);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    const isValid = paymentService.verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};
