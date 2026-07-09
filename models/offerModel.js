import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    image: {
        type: String,
        default: null
    },
    offerType: {
        type: String,
        enum: ["product", "category", "referral"],
        required: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscountAmount: {
        type: Number,
        default: null  // Only applies to percentage discounts
    },
    // For product or category offers
    applicableTo: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "applicableModel",
        default: null
    },
    applicableModel: {
        type: String,
        enum: ["Product", "Category"],
        default: null
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Referral-specific fields
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    referralToken: {
        type: String,
        unique: true,
        sparse: true
    },
    maxUses: {
        type: Number,
        default: null  // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
