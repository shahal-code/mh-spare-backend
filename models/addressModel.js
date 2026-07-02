import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: true
    },
    line1: {
        type: String,
        required: true
    },
    line2: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    postal_code: {
        type: String,
        required: true
    },
    address_type: {
        type: String,
        required: true
    },
    is_default: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Address = mongoose.model("Address", addressSchema);

export default Address;
