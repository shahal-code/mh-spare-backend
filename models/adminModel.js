import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "vendor"],
      default: "admin",
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "pending",
    },
    kycStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified",
    },
    kycDocuments: {
      idProof: String,
      businessLicense: String,
    },
    storeDetails: {
      storeName: String,
      description: String,
      logo: String,
      phone: String,
      address: String,
    },
    loginOtp: String,
    loginOtpExpires: Date,
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
