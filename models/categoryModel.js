import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    url_slug: { // URL slug based on design
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    image: { // Category image path
      type: String,
      required: false
    },
    createdBy: { // Admin / Vendor who created this category
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: false
    },
    is_blocked: { // Soft-delete / block flag
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at' 
    },
  }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
