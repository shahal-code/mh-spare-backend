import mongoose from "mongoose";

const contactInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    orderId: { type: String, default: "" },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "read", "replied"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("ContactInquiry", contactInquirySchema);
