import mongoose from "mongoose";
const orderSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
   
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    
    orderedItems: [{
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantId: {
            type: String, 
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number, 
            required: true
        },
        commissionAmount: {
            type: Number,
            default: 0
        },
        vendorEarning: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            required: true,
            enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
            default: 'Pending'
        },
        cancellationReason: {
            type: String,
            default: null
        },
        returnReason: {
            type: String,
            default: null
        },
        trackingNumber: {
            type: String,
            default: null
        },
        courierName: {
            type: String,
            default: null
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    
    shippingAddress: {
        fullname: String,
        phone: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        postal_code: String
    },
    paymentMethod: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid', 'Failed', 'Partially Refunded', 'Refunded'],
        default: 'Pending'
    },
    inventoryProcessed: {
        type: Boolean,
        default: true
    },
    cancellationReason: {
        type: String,
        default: null
    },
    returnReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;
