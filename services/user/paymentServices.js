import crypto from "crypto";
import razorpay from "../../config/razorpay.js";

// Razorpay maximum allowed amount is ₹5,00,000 (50,000,000 paise)
const RAZORPAY_MAX_AMOUNT_INR = 500000;

export const createRazorpayOrder = async (amount) => {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (Number(amount) > RAZORPAY_MAX_AMOUNT_INR) {
    throw new Error(
      `Order total ₹${Number(amount).toLocaleString('en-IN')} exceeds the maximum allowed amount of ₹${RAZORPAY_MAX_AMOUNT_INR.toLocaleString('en-IN')} for online payment. Please use Cash on Delivery or split your order.`
    );
  }

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  return await razorpay.orders.create(options);
};

export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};
