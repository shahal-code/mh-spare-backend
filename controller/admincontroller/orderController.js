import * as OrderService from "../../services/admin/ordersService.js";
import Order from "../../models/ordersModel.js";
import { generateInvoice } from "../../utils/invoiceGenerator.js";

export const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const { orders, totalPages, totalOrders } = await OrderService.getAllOrders(req.query, page, limit);

        const totalOrdersCount = await Order.countDocuments();
        const pendingOrdersCount = await Order.countDocuments({ status: "Pending" });
        const canceledOrdersCount = await Order.countDocuments({ status: "Cancelled" });
        const completedOrdersCount = await Order.countDocuments({ status: "Delivered" });

        res.render("admin/orders/orders", {
            orders,
            page,
            totalPages,
            totalOrders,
            limit,
            activePage: "orders",
            filters: req.query,
            totalOrdersCount,
            pendingOrdersCount,
            canceledOrdersCount,
            completedOrdersCount
        });
    } catch (error) {
        console.error("Error loading admin orders:", error);
        res.status(500).render("admin/error", { message: "Failed to load orders" });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await OrderService.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.json({ success: true, order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ success: false, message: "Failed to fetch order details" });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const updatedOrder = await OrderService.updateOrderStatus(orderId, status);
        if (updatedOrder) {
            res.json({ success: true, message: "Order status updated successfully" });
        } else {
            res.status(400).json({ success: false, message: "Failed to update status" });
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(400).json({ success: false, message: error.message || "Internal server error" });
    }
};

export const updateOrderItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        const updatedOrder = await OrderService.updateOrderItemStatus(orderId, itemId, status);
        if (updatedOrder) {
            res.json({ success: true, message: "Item status updated successfully" });
        } else {
            res.status(400).json({ success: false, message: "Failed to update item status" });
        }
    } catch (error) {
        console.error("Error updating order item status:", error);
        res.status(400).json({ success: false, message: error.message || "Internal server error" });
    }
};

export const loadReturns = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const { orders, totalPages, totalOrders } = await OrderService.getReturnRequests(req.query, page, limit);

        res.render("admin/orders/returns", {
            orders,
            page,
            totalPages,
            totalOrders,
            limit,
            activePage: "returns",
            search:req.query.search || ""
        });
    } catch (error) {
        console.error("Error loading return requests:", error);
        res.status(500).render("admin/error", { message: "Failed to load return requests" });
    }
};

export const downloadInvoiceAdmin = async (req, res) => {

    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate("userId")
            .populate("orderedItems.product");

        if (!order) {
            return res.status(404).send("Invoice not available.");
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=invoice-${order.orderId}.pdf`
        );
        generateInvoice(res, order);
    } catch (error) {
        console.error("Admin Invoice Download Error:", error);
        res.status(500).send("Failed to generate invoice.");
    }
};