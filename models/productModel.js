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
    is_blocked: { 
        type: Boolean, 
        default: false 
    },
    is_unlisted: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

export default Product;

