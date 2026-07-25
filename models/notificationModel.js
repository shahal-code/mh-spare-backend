import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin', 
        required: true,
        index: true
    },
    title: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String,
        default: 'info'
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    link: { 
        type: String,
        default: null
    }
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
