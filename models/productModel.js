import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema({
    size: { type: String },
    processorBrand: { type: String, enum: ['Intel', 'AMD'] },
    processor: { type: String },
    ram: { type: String },
    gpu: { type: String },
    storage: { type: String },
    color: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    images: [{ 
        type: String, 
        required: true 
    }],
    sku: { type: String, required: true },
    is_blocked: { type: Boolean, default: false }
}, { timestamps: true });

const wholesaleTierSchema = new mongoose.Schema({
    minQty: { type: Number, required: true },
    price: { type: Number, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    category_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    material: { 
        type: String 
    },
    highlights: [{ 
        type: String 
    }],
    thumbnail: {
        type: String
    },
    specifications: {
        partNumber: { type: String },
        compatibility: { type: String },
        brand: { type: String },
        condition: { type: String },
        material: { type: String },
        warranty: { type: String },
        weight: { type: String },
        display: { type: String },
        battery: { type: String },
        os: { type: String }
    },
    variants: [productVariantSchema],
    wholesaleTiers: [wholesaleTierSchema],
    is_blocked: { 
        type: Boolean, 
        default: false 
    },
    blockedBy: {
        type: String,
        enum: ['superadmin', 'vendor', null],
        default: null
    },
    is_unlisted: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

// Compound indexes for 5ms query speeds
productSchema.index({ is_blocked: 1, is_unlisted: 1, approvalStatus: 1, category_id: 1 });
productSchema.index({ adminId: 1, is_blocked: 1, createdAt: -1 });
productSchema.index({ approvalStatus: 1, createdAt: -1 });
productSchema.index({ name: "text", description: "text", "specifications.partNumber": "text" });

const Product = mongoose.model("Product", productSchema);

export default Product;

