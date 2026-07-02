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
    storeDetails: {
      storeName: String,
      description: String,
      logo: String,
      phone: String,
      address: String,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
