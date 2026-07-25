/**
 * sseManager.js
 * 
 * A central registry of Server-Sent Event (SSE) connections.
 * When a new notification is created, we look up the admin's connection
 * and push the event directly to their browser — no polling needed.
 */

// Map: adminId (string) -> SSE response object
const clients = new Map();

/**
 * Register an admin's SSE connection.
 * @param {string} adminId
 * @param {import('express').Response} res
 */
export function addClient(adminId, res) {
    // If there's already a connection for this admin, close the old one
    if (clients.has(adminId)) {
        try { clients.get(adminId).end(); } catch (_) {}
    }
    clients.set(adminId, res);
}

/**
 * Remove an admin's SSE connection.
 * @param {string} adminId
 */
export function removeClient(adminId) {
    clients.delete(adminId);
}

/**
 * Push a raw SSE event to a specific admin.
 * @param {string} adminId
 * @param {string} event  - the event name
 * @param {object} data   - the payload (will be JSON-stringified)
 */
export function sendToClient(adminId, event, data) {
    const res = clients.get(String(adminId));
    if (res) {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            console.error('SSE write error:', err.message);
            removeClient(adminId);
        }
    }
}

/**
 * Push an event to ALL connected admins (e.g. super admins watching globally).
 * @param {string} event
 * @param {object} data
 */
export function broadcast(event, data) {
    for (const [adminId, res] of clients.entries()) {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            removeClient(adminId);
        }
    }
}
