import orderService from "../../services/user/orderService.js";
import { generateInvoice } from "../../utils/invoiceGenerator.js";


export const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const { orders, totalPages, totalOrders } = await orderService.getOrders(userId, req.query, page, limit);

        res.render("user/orders/orders", {
            orders,
            page,
            totalPages,
            totalOrders,
            search: req.query.search || "",
            path: "/user/orders"
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).redirect("/user/profile");
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;

        const order = await orderService.getOrderById(orderId, userId);
        if (!order) {
            return res.status(404).redirect("/user/orders");
        }

        res.render("user/orders/orderDetails", {
            order,
            path: "/user/orders"
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).redirect("/user/orders");
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        await orderService.cancelOrder(orderId, userId, reason);

        res.status(200).json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        await orderService.returnOrder(orderId, userId, reason);

        res.status(200).json({ success: true, message: "Return request submitted." });
    } catch (error) {
        console.error("Error returning order:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;

        const order = await orderService.getOrderById(orderId, userId);
        if (!order) {
            return res.status(404).send("Invoice not available.");
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);

        // Use the utility to generate and stream the PDF
        generateInvoice(res, order);

    } catch (error) {
        console.error("Invoice Download Error:", error);
        res.status(500).send("Failed to generate invoice.");
    }
};

export const cancelOrderItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        await orderService.cancelOrderItem(orderId, itemId, userId, reason);

        res.status(200).json({ success: true, message: "Item cancelled successfully." });
    } catch (error) {
        console.error("Error cancelling order item:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const returnOrderItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        await orderService.returnOrderItem(orderId, itemId, userId, reason);

        res.status(200).json({ success: true, message: "Item return request submitted." });
    } catch (error) {
        console.error("Error returning order item:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};
