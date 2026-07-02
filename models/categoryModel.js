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
    url_slug: { // URL slug based on your design
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
    is_blocked: { // Soft-delete flag
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
