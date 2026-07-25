import Notification from "../../models/notificationModel.js";
import Admin from "../../models/adminModel.js";
import { sendToClient } from "../../utils/sseManager.js";

/**
 * Creates a notification for a specific admin/vendor and pushes it via SSE.
 */
export const notifyAdmin = async (adminId, title, message, type = 'info', link = null) => {
    try {
        const notification = await Notification.create({
            adminId,
            title,
            message,
            type,
            link
        });
        // Push real-time event to the connected client
        sendToClient(String(adminId), 'new_notification', {
            _id: notification._id,
            adminId: notification.adminId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            isRead: notification.isRead,
            createdAt: notification.createdAt
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * Creates a notification for ALL Super Admins (owners) and pushes via SSE.
 */
export const notifySuperAdmins = async (title, message, type = 'info', link = null) => {
    try {
        const superAdmins = await Admin.find({ role: 'owner' });
        const notifications = superAdmins.map(admin => ({
            adminId: admin._id,
            title,
            message,
            type,
            link
        }));
        if (notifications.length > 0) {
            const created = await Notification.insertMany(notifications);
            // Push real-time event to each connected super admin
            created.forEach(notification => {
                sendToClient(String(notification.adminId), 'new_notification', {
                    _id: notification._id,
                    adminId: notification.adminId,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    link: notification.link,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt
                });
            });
        }
    } catch (error) {
        console.error("Error creating super admin notifications:", error);
    }
};

/**
 * Gets notifications for an admin
 */
export const getAdminNotifications = async (adminId) => {
    return await Notification.find({ adminId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
};

/**
 * Marks notifications as read
 */
export const markNotificationsAsRead = async (adminId, notificationId = null) => {
    const query = { adminId, isRead: false };
    if (notificationId) {
        query._id = notificationId;
    }
    await Notification.updateMany(query, { $set: { isRead: true } });
};

