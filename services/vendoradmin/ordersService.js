import mongoose from "mongoose";
import Order from "../../models/ordersModel.js";
import Product from "../../models/productModel.js";
import * as walletService from "../user/walletService.js";

const ORDER_PROGRESS_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
const RETURN_STATUSES = ['Return Request', 'Returned'];
const TERMINAL_STATUSES = ['Cancelled', 'Returned'];
const VALID_ORDER_STATUSES = [...ORDER_PROGRESS_STATUSES, 'Cancelled', ...RETURN_STATUSES];

const validateStatusTransition = (currentStatus, nextStatus, entityName = "Order") => {
    if (!VALID_ORDER_STATUSES.includes(nextStatus)) {
        throw new Error("Invalid order status.");
    }

    if (currentStatus === nextStatus) return;

    if (TERMINAL_STATUSES.includes(currentStatus)) {
        throw new Error(`${entityName} status cannot be changed after it is ${currentStatus}.`);
    }

    if (currentStatus === 'Return Request') {
        if (nextStatus === 'Returned' || nextStatus === 'Delivered') return;
        throw new Error(`${entityName} return requests can only be approved as Returned or rejected back to Delivered.`);
    }

    if (nextStatus === 'Return Request') {
        throw new Error("Return requests must be submitted by the customer.");
    }

    const currentIndex = ORDER_PROGRESS_STATUSES.indexOf(currentStatus);
    const nextIndex = ORDER_PROGRESS_STATUSES.indexOf(nextStatus);

    if (currentIndex !== -1 && nextIndex !== -1 && nextIndex < currentIndex) {
        throw new Error(`Cannot move ${entityName.toLowerCase()} status back from ${currentStatus} to ${nextStatus}.`);
    }

    if (currentStatus === 'Delivered' && nextStatus === 'Cancelled') {
        throw new Error(`${entityName} cannot be cancelled after it is delivered.`);
    }

    if (nextStatus === 'Returned') {
        throw new Error(`${entityName} can be returned only from a return request.`);
    }
};

export const getAllOrders = async (queryParams, page, limit, adminContext = null) => {
    const { startDate, endDate, status, paymentMethod, paymentStatus, vendorId, minAmount, search } = queryParams;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (adminContext && adminContext.role !== 'owner') {
        query["orderedItems.adminId"] = adminContext._id;
    } else if (vendorId) {
        // If super admin and a specific vendor is selected
        query["orderedItems.adminId"] = vendorId;
    }

    // Filter by Status
    if (status) query.status = status;
    // Filter by Payment Status
    if (paymentStatus) query.paymentStatus = paymentStatus;
    // Filter by Payment Method
    if (paymentMethod) query.paymentMethod = { $regex: new RegExp(`^${paymentMethod}$`, 'i') };
    // Filter by Minimum Amount (High Value Orders)
    if (minAmount) query.finalAmount = { $gte: Number(minAmount) };
    // Filter by Date Range
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    // Search Logic
    if (search) {
        const User = (await import("../../models/userModel.js")).default;
        const matchingUsers = await User.find({
            fullname: { $regex: search, $options: 'i' }
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);

        const matchingProducts = await Product.find({
            name: { $regex: search, $options: 'i' }
        }).select('_id');
        const productIds = matchingProducts.map(p => p._id);

        query.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { userId: { $in: userIds } },
            { "orderedItems.product": { $in: productIds } }
        ];
    }

    const orders = await Order.find(query)
        .populate("userId")
        .populate("orderedItems.product")
        .populate("orderedItems.adminId", "fullname storeDetails")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
    // Filter items to only show the vendor's items if not owner
    if (adminContext && adminContext.role !== 'owner') {
        const adminIdStr = adminContext._id.toString();
        orders.forEach(order => {
            order.orderedItems = order.orderedItems.filter(item => {
                if (!item.adminId) return false;
                // After lean(), populated adminId is a plain object with _id field
                const itemAdminId = item.adminId._id ? item.adminId._id.toString() : item.adminId.toString();
                return itemAdminId === adminIdStr;
            });
        });
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    return {
        orders, totalOrders, totalPages
    };
};

export const getOrderStats = async (adminContext = null) => {
    const query = {};
    if (adminContext && adminContext.role !== 'owner') {
        query["orderedItems.adminId"] = adminContext._id;
    }
    
    // Total orders containing this vendor's items
    const totalOrdersCount = await Order.countDocuments(query);
    
    // We count based on item status if vendor
    if (adminContext && adminContext.role !== 'owner') {
        const pendingOrdersCount = await Order.countDocuments({ ...query, "orderedItems.status": "Pending" });
        const confirmedOrdersCount = await Order.countDocuments({ ...query, "orderedItems.status": "Confirmed" });
        const shippedOrdersCount = await Order.countDocuments({ ...query, "orderedItems.status": "Shipped" });
        const outForDeliveryOrdersCount = await Order.countDocuments({ ...query, "orderedItems.status": "Out for Delivery" });
        const completedOrdersCount = await Order.countDocuments({ ...query, "orderedItems.status": "Delivered" });
        return { totalOrdersCount, pendingOrdersCount, confirmedOrdersCount, shippedOrdersCount, outForDeliveryOrdersCount, completedOrdersCount };
    }
    
    const pendingOrdersCount = await Order.countDocuments({ status: "Pending" });
    const confirmedOrdersCount = await Order.countDocuments({ status: "Confirmed" });
    const shippedOrdersCount = await Order.countDocuments({ status: "Shipped" });
    const outForDeliveryOrdersCount = await Order.countDocuments({ status: "Out for Delivery" });
    const completedOrdersCount = await Order.countDocuments({ status: "Delivered" });
    return { totalOrdersCount, pendingOrdersCount, confirmedOrdersCount, shippedOrdersCount, outForDeliveryOrdersCount, completedOrdersCount };
};

export const bulkUpdateOrderStatus = async (orderIds, status) => {
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const orderId of orderIds) {
        try {
            await updateOrderStatus(orderId, status);
            successCount++;
        } catch (error) {
            failedCount++;
            errors.push(`Order ${orderId}: ${error.message}`);
        }
    }

    return { successCount, failedCount, errors };
};

export const getOrderById = async (orderId, adminContext = null) => {
    const orderObj = await Order.findById(orderId)
        .populate("userId")
        .populate("orderedItems.product")
        .populate("orderedItems.adminId", "fullname storeDetails")
        .lean();

    if (!orderObj) return null;

    if (adminContext && adminContext.role !== 'owner') {
        const adminIdStr = adminContext._id.toString();
        orderObj.orderedItems = (orderObj.orderedItems || []).filter(item => {
            if (!item.adminId) return false;
            const itemAdminId = item.adminId._id ? item.adminId._id.toString() : item.adminId.toString();
            return itemAdminId === adminIdStr;
        });
    }

    return orderObj;
};

export const updateOrderStatus = async (orderId, status, adminContext = null) => {
    const order = await Order.findById(orderId);
    if (!order) return null;

    validateStatusTransition(order.status, status, "Order");

    const activeStatuses = [...ORDER_PROGRESS_STATUSES, 'Return Request'];
    const isOwner = !adminContext || adminContext.role === 'owner';
    const adminIdStr = adminContext ? adminContext._id.toString() : null;

    for (const item of order.orderedItems) {
        if (!isOwner) {
            if (!item.adminId) continue;
            const itemAdminId = item.adminId._id ? item.adminId._id.toString() : item.adminId.toString();
            if (itemAdminId !== adminIdStr) continue;
        }

        const oldItemStatus = item.status;

        validateStatusTransition(oldItemStatus, status, "Item");

        // If item was active and is now being cancelled/returned, restore stock
        if (order.inventoryProcessed !== false && TERMINAL_STATUSES.includes(status) && activeStatuses.includes(oldItemStatus)) {
            await Product.updateOne(
                { _id: item.product, "variants._id": new mongoose.Types.ObjectId(item.variantId) },
                { $inc: { "variants.$.stock": item.quantity } }
            );
        }
        item.status = status;
    }

    if (status === 'Delivered' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
    }

    // Refund logic for full return
    if (status === 'Returned' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded')) {
        let refundAmount = 0;
        
        // If all items are being returned now and none were cancelled
        const hasCancelled = order.orderedItems.some(i => i.cancellationReason);
        if (!hasCancelled) {
            refundAmount = order.finalAmount;
        } else {
            order.orderedItems.forEach(item => {
                if (item.status === 'Returned') {
                    refundAmount += (item.price * item.quantity);
                }
            });
        }
        
        if (refundAmount > 0) {
            await walletService.creditWallet(
                order.userId,
                refundAmount,
                `Refund for returned order ${order.orderId}`,
                order.orderId
            );
        }
        order.paymentStatus = 'Refunded';
    }

    const allItemStatuses = order.orderedItems.map(i => i.status);
    if (isOwner || allItemStatuses.every(s => s === status)) {
        order.status = status;
    }

    order.markModified("orderedItems");
    console.log(`Updating Order ${orderId} by ${isOwner ? 'owner' : adminIdStr} to status: ${status}`);
    await order.save();
    return order;
};

export const updateOrderItemStatus = async (orderId, itemId, status, adminContext = null) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found.");

    const item = order.orderedItems.id(itemId);
    if (!item) throw new Error("Item not found in order.");

    if (adminContext && adminContext.role !== 'owner') {
        const adminIdStr = adminContext._id.toString();
        const itemAdminId = item.adminId ? (item.adminId._id ? item.adminId._id.toString() : item.adminId.toString()) : '';
        if (itemAdminId !== adminIdStr) {
            throw new Error("Unauthorized to update item for another vendor.");
        }
    }

    const oldStatus = item.status;
    if (oldStatus === status) return order;

    validateStatusTransition(oldStatus, status, "Item");

    console.log(`Updating Item ${itemId} in Order ${orderId} from ${oldStatus} to ${status}`);

    // Stock Management
    if (order.inventoryProcessed !== false && (status === 'Cancelled' || status === 'Returned')) {
        if (oldStatus !== 'Cancelled' && oldStatus !== 'Returned') {
            await Product.updateOne(
                { _id: item.product, "variants._id": new mongoose.Types.ObjectId(item.variantId) },
                { $inc: { "variants.$.stock": item.quantity } }
            );
        }
    }

    item.status = status;

    // Refund for single item return
    if (status === 'Returned' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded')) {
        const refundAmount = item.price * item.quantity;
        await walletService.creditWallet(
            order.userId,
            refundAmount,
            `Refund for returned item in order ${order.orderId}`,
            order.orderId
        );
        order.paymentStatus = 'Partially Refunded';
    }

    // If all items have the same status, update the global order status
    const statuses = order.orderedItems.map(i => i.status);
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length === 1) {
        order.status = uniqueStatuses[0];
        if (order.status === 'Returned' && order.paymentStatus === 'Partially Refunded') {
            order.paymentStatus = 'Refunded';
        }
    } else {
        const terminalStatuses = ['Delivered', 'Returned', 'Cancelled'];
        const allTerminal = statuses.every(s => terminalStatuses.includes(s));

        if (allTerminal) {
            if (statuses.includes('Delivered')) order.status = 'Delivered';
            else if (statuses.includes('Returned')) {
                order.status = 'Returned';
                if (order.paymentStatus === 'Partially Refunded') order.paymentStatus = 'Refunded';
            }
            else order.status = 'Cancelled';
        } else {
            if (statuses.includes('Out for Delivery')) order.status = 'Out for Delivery';
            else if (statuses.includes('Shipped')) order.status = 'Shipped';
            else if (statuses.includes('Processing')) order.status = 'Processing';
            else order.status = 'Pending';
        }
    }

    if (order.status === 'Delivered' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
    }

    order.markModified("orderedItems");
    await order.save();
    return order;
};

export const getReturnRequests = async (queryParams ,page, limit) => {
    const skip = (page - 1) * limit;

    const {search}=queryParams;

    // Find orders where at least one item has a return request
    let query = {
        "orderedItems.status": "Return Request"
    };

    if(search){
        const cleanSearch = search.replace("#","").trim();
        const User=(await import ("../../models/userModel.js")).default

        const matchingUsers=await User.find({
            fullname:{$regex:cleanSearch,$options:"i"}
        }).select("_id");

        const userIds=matchingUsers.map(u=>u._id);

        const matchingProduct=await Product.find({
            name:{$regex:cleanSearch,$options:"i"}
        }).select("_id");

        let productIds=matchingProduct.map(p=>p._id);

          query = {
            $and: [
                { "orderedItems.status": "Return Request" },

                {
                    $or: [
                        { orderId: { $regex: cleanSearch, $options: "i" } },
                        { userId: { $in: userIds } },
                        { "orderedItems.product": { $in: productIds } },
                        { "orderedItems.returnReason": { $regex: cleanSearch, $options: "i" } }
                    ]
                }
            ]
        };
    }
    
    const orders = await Order.find(query)
        .populate("userId")
        .populate("orderedItems.product")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    return { orders, totalPages, totalOrders };
};
