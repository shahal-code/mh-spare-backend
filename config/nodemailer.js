import nodemailer from "nodemailer";

/**
 * Gmail SMTP transporter.
 * Using explicit SMTP config (host/port) instead of service:"gmail" 
 * is more reliable and avoids some spam triggers.
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection on startup so we catch config errors early
transporter.verify((error) => {
    if (error) {
        console.error("❌ Nodemailer connection failed:", error.message);
    } else {
        console.log("✅ Nodemailer ready — SMTP connected to Gmail");
    }
});

/**
 * Shared headers that help emails land in inbox instead of spam.
 * - Reply-To: gives spam filters a return path
 * - X-Mailer: identifies the sending agent
 * - Precedence/List-Unsubscribe: tells Gmail this is transactional, not bulk spam
 */
const INBOX_HEADERS = {
    "Reply-To": process.env.NODEMAILER_EMAIL,
    "X-Mailer": "ESPARE-HUB-Mailer/1.0",
    "X-Priority": "1",
    "Importance": "High",
    "Precedence": "transactional",
};

export const sendOtpEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: {
                name: "ESPARE HUB",
                address: process.env.NODEMAILER_EMAIL
            },
            to: email,
            subject: `Your verification code is ${otp}`,   // plain subject = better inbox rate
            headers: INBOX_HEADERS,
            // Plain-text fallback — REQUIRED for inbox delivery; HTML-only = spam
            text: `Hi,\n\nYour ESPARE HUB verification code is: ${otp}\n\nThis code expires in 2 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— ESPARE HUB Team`,
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verification Code</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;max-width:560px;width:100%;">
        
        <!-- Header -->
        <tr>
          <td style="background:#0657f9;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;">ESPARE HUB</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">Verify your identity</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              Use the code below to complete your sign-in. It expires in <strong style="color:#09090b;">2 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="display:inline-block;background:#f4f7ff;border:2px dashed #0657f9;border-radius:12px;padding:20px 40px;margin-bottom:28px;">
              <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#0657f9;font-family:'Courier New',monospace;">${otp}</span>
            </div>

            <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
              If you did not request this code, you can safely ignore this email.<br>
              Someone else might have typed your email address by mistake.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f0f0f0;margin:0;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              © ${new Date().getFullYear()} ESPARE HUB &nbsp;·&nbsp; This is an automated message, please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email} — ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Error sending OTP email:", error.message);
        console.log(`[FALLBACK] To: ${email} | OTP: ${otp}`);
        return false;
    }
};

export const sendVerificationLink = async (email, link) => {
    try {
        const mailOptions = {
            from: { name: "ESPARE HUB", address: process.env.NODEMAILER_EMAIL },
            to: email,
            subject: "Confirm your new email address",
            headers: INBOX_HEADERS,
            text: `Hi,\n\nPlease confirm your new email address by visiting the link below:\n\n${link}\n\nThis link expires in 15 minutes.\n\nIf you did not request this change, please ignore this email.\n\n— ESPARE HUB Team`,
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm Email</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;max-width:560px;width:100%;">
        <tr>
          <td style="background:#0657f9;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;">ESPARE HUB</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">Confirm your email</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6;">
              We received a request to update your <strong style="color:#09090b;">ESPARE HUB</strong> account email address.<br>
              Click the button below to confirm this change. This link expires in <strong style="color:#09090b;">15 minutes</strong>.
            </p>
            <a href="${link}" style="display:inline-block;background:#0657f9;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;">Verify Email Address</a>
            <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;word-break:break-all;">
              Or copy this link into your browser:<br>
              <a href="${link}" style="color:#0657f9;text-decoration:none;">${link}</a>
            </p>
            <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">If you did not request this change, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f0f0f0;margin:0;"></td></tr>
        <tr>
          <td style="padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">© ${new Date().getFullYear()} ESPARE HUB &nbsp;·&nbsp; This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Verification link sent to ${email} — ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Error sending verification link email:", error.message);
        console.log(`[FALLBACK] To: ${email} | Link: ${link}`);
        return false;
    }
};

/**
 * Sends a "New Order" notification email to a vendor
 * @param {string} vendorEmail  - Vendor's email address
 * @param {string} vendorName   - Vendor's display name
 * @param {object} order        - The order object
 * @param {Array}  items        - Items belonging to this vendor
 */
export const sendVendorOrderEmail = async (vendorEmail, vendorName, order, items) => {
    try {
        const itemRows = items.map(item => `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #e4e4e7; font-size: 14px;">${item.productName || 'Product'}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 14px; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #0657f9; font-size: 14px; font-weight: 600; text-align: right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: { name: "ESPARE HUB", address: process.env.NODEMAILER_EMAIL },
            to: vendorEmail,
            subject: `🛒 New Order Received — #${order.orderId}`,
            headers: INBOX_HEADERS,
            text: `Hi ${vendorName},\n\nA customer just ordered your product! Order ID: #${order.orderId}.\nPlease log into your vendor dashboard to process this order.\n\n— ESPARE HUB`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; color: #ffffff;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0657f9 0%, #0040c1 100%); padding: 32px 28px; text-align: center;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.15); padding: 6px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.2);">
                            <span style="font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">ESPARE HUB</span>
                        </div>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.2;">🎉 New Order Received!</h1>
                        <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.8);">Hi ${vendorName}, a customer just ordered your product!</p>
                    </div>

                    <!-- Order ID Badge -->
                    <div style="padding: 20px 28px; background-color: #0f0f11; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order ID</p>
                            <p style="margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #0657f9;">#${order.orderId}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Date</p>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #a1a1aa;">${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div style="padding: 24px 28px;">
                        <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #ffffff;">📦 Your Items in This Order</h2>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #27272a; border-radius: 10px; overflow: hidden;">
                            <thead>
                                <tr style="background-color: #18181b;">
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRows}
                            </tbody>
                        </table>
                    </div>

                    <!-- Payment Method -->
                    <div style="padding: 0 28px 24px;">
                        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">💳</span>
                            <div>
                                <p style="margin: 0; font-size: 12px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</p>
                                <p style="margin: 4px 0 0; font-size: 15px; color: #e4e4e7; font-weight: 600;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- CTA -->
                    <div style="padding: 0 28px 32px; text-align: center;">
                        <a href="${(process.env.ADMIN_URL || 'http://localhost:5174').split(',')[0].trim().replace(/\/$/, '')}/vendor/orders" style="display: inline-block; background: linear-gradient(135deg, #0657f9 0%, #0040c1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 20px rgba(6, 87, 249, 0.35);">View Order in Dashboard →</a>
                        <p style="margin: 16px 0 0; font-size: 13px; color: #52525b;">Please process this order promptly to ensure customer satisfaction.</p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px 28px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="color: #71717a; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ESPARE HUB. All rights reserved. | This is an automated email, please do not reply.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Vendor order email sent to ${vendorEmail} — ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Error sending vendor order email to ${vendorEmail}:`, error.message);
        return false;
    }
};


/**
 * Sends an order status update email to the customer
 * @param {string} userEmail   - Customer's email
 * @param {string} userName    - Customer's name
 * @param {object} order       - The full order object
 * @param {string} newStatus   - The new status string
 */
export const sendUserOrderStatusEmail = async (userEmail, userName, order, newStatus) => {
    try {
        // Status-specific config
        const statusConfig = {
            'Confirmed':        { emoji: '✅', color: '#22c55e', label: 'Order Confirmed',        msg: 'Great news! Your order has been confirmed and is being prepared.' },
            'Shipped':          { emoji: '🚚', color: '#3b82f6', label: 'Order Shipped',           msg: 'Your order is on its way! It has been handed over to the delivery partner.' },
            'Out for Delivery': { emoji: '📦', color: '#f59e0b', label: 'Out for Delivery',        msg: 'Your order is almost there! Our delivery partner is heading to your address right now.' },
            'Delivered':        { emoji: '🎉', color: '#22c55e', label: 'Order Delivered',         msg: 'Your order has been successfully delivered. We hope you love your purchase!' },
            'Cancelled':        { emoji: '❌', color: '#ef4444', label: 'Order Cancelled',         msg: 'Your order has been cancelled. If you paid online, a refund will be processed shortly.' },
            'Return Request':   { emoji: '🔄', color: '#8b5cf6', label: 'Return Request Received', msg: 'We have received your return request and are processing it.' },
            'Returned':         { emoji: '↩️', color: '#8b5cf6', label: 'Order Returned',          msg: 'Your return has been processed. If eligible, a refund has been credited to your wallet.' },
        };

        const cfg = statusConfig[newStatus] || { emoji: 'ℹ️', color: '#0657f9', label: `Status: ${newStatus}`, msg: `Your order status has been updated to: ${newStatus}.` };

        const itemRows = order.orderedItems.map(item => `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #e4e4e7; font-size: 14px;">${item.productName || 'Product'}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 14px; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #e4e4e7; font-size: 14px; text-align: right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
            </tr>
        `).join('');

        const addr = order.shippingAddress;
        const addressLine = addr
            ? `${addr.fullname || ''}, ${addr.line1 || ''}, ${addr.line2 ? addr.line2 + ', ' : ''}${addr.city || ''}, ${addr.state || ''} - ${addr.postal_code || ''}`
            : 'N/A';

        const mailOptions = {
            from: { name: "ESPARE HUB", address: process.env.NODEMAILER_EMAIL },
            to: userEmail,
            subject: `${cfg.emoji} ${cfg.label} — Order #${order.orderId}`,
            headers: INBOX_HEADERS,
            text: `Hi ${userName},\n\n${cfg.msg}\nOrder ID: #${order.orderId}\nStatus: ${newStatus}\n\n— ESPARE HUB Team`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; color: #ffffff;">

                    <!-- Header Banner -->
                    <div style="background: linear-gradient(135deg, ${cfg.color}22 0%, #09090b 80%); padding: 32px 28px; text-align: center; border-bottom: 1px solid ${cfg.color}33;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid #27272a;">
                            <span style="font-size: 11px; font-weight: 700; color: #71717a; letter-spacing: 2px; text-transform: uppercase;">ESPARE HUB</span>
                        </div>
                        <div style="font-size: 48px; margin-bottom: 12px;">${cfg.emoji}</div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">${cfg.label}</h1>
                        <p style="margin: 10px 0 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">Hi ${userName}, ${cfg.msg}</p>
                    </div>

                    <!-- Order Summary Bar -->
                    <div style="background-color: #0f0f11; padding: 16px 28px; border-bottom: 1px solid #27272a; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <p style="margin: 0; font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
                            <p style="margin: 4px 0 0; font-size: 18px; font-weight: 800; color: ${cfg.color};">#${order.orderId}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Status</p>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: ${cfg.color};">${newStatus}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Updated On</p>
                            <p style="margin: 4px 0 0; font-size: 13px; color: #a1a1aa;">${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div style="padding: 24px 28px;">
                        <h2 style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #ffffff;">📦 Order Items</h2>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #27272a; border-radius: 10px; overflow: hidden;">
                            <thead>
                                <tr style="background-color: #18181b;">
                                    <th style="padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                                    <th style="padding: 11px 16px; text-align: center; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase;">Qty</th>
                                    <th style="padding: 11px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase;">Price</th>
                                </tr>
                            </thead>
                            <tbody>${itemRows}</tbody>
                        </table>
                    </div>

                    <!-- Totals + Payment -->
                    <div style="padding: 0 28px 20px;">
                        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 13px; color: #71717a;">Subtotal</span>
                                <span style="font-size: 13px; color: #a1a1aa;">₹${(order.totalPrice || 0).toLocaleString('en-IN')}</span>
                            </div>
                            ${order.discount > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 13px; color: #71717a;">Discount</span>
                                <span style="font-size: 13px; color: #22c55e;">- ₹${(order.discount || 0).toLocaleString('en-IN')}</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #27272a;">
                                <span style="font-size: 15px; font-weight: 700; color: #ffffff;">Total Paid</span>
                                <span style="font-size: 15px; font-weight: 800; color: ${cfg.color};">₹${(order.finalAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                                <span style="font-size: 12px; color: #71717a;">Payment</span>
                                <span style="font-size: 12px; font-weight: 600; color: #a1a1aa;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'} — ${order.paymentStatus || ''}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Shipping Address -->
                    <div style="padding: 0 28px 24px;">
                        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 14px 18px;">
                            <p style="margin: 0 0 6px; font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 Shipping Address</p>
                            <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">${addressLine}</p>
                        </div>
                    </div>

                    <!-- CTA -->
                    <div style="padding: 0 28px 32px; text-align: center;">
                        <a href="${(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '')}/user/orders" style="display: inline-block; background: linear-gradient(135deg, ${cfg.color} 0%, ${cfg.color}cc 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 12px; box-shadow: 0 4px 20px ${cfg.color}44;">Track My Order →</a>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 18px 28px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ESPARE HUB. All rights reserved. | This is an automated email, please do not reply.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Order status email sent to ${userEmail} [${newStatus}] — ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Error sending order status email to ${userEmail}:`, error.message);
        return false;
    }
};

/**
 * Send customer contact inquiry email to admin (mhspare@gmail.com)
 * and auto-reply confirmation to the customer.
 */
export const sendContactInquiryEmail = async ({ name, email, phone, orderId, message }) => {
    try {
        const targetAdminEmail = process.env.ADMIN_SUPPORT_EMAIL || "mhsparehub@gmail.com";
        const mailOptions = {
            from: {
                name: "ESPARE HUB Website Inquiry",
                address: process.env.NODEMAILER_EMAIL
            },
            to: targetAdminEmail,
            replyTo: email,
            subject: `📩 New Customer Message from ${name} (${orderId ? 'Order: ' + orderId : 'General Inquiry'})`,
            headers: INBOX_HEADERS,
            text: `New Inquiry Received from ESPARE HUB Contact Form:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nOrder ID: ${orderId || 'N/A'}\n\nMessage:\n${message}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 2px solid #2563eb;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">📩 New Customer Inquiry</h2>
                        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Received from E-Spare Hub Contact Page</p>
                    </div>
                    <div style="padding: 24px;">
                        <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; color: #1e293b; border-collapse: collapse; margin-bottom: 20px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: 700; color: #64748b; width: 110px;">Name:</td><td>${name}</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: 700; color: #64748b;">Email:</td><td><a href="mailto:${email}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${email}</a></td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: 700; color: #64748b;">Phone:</td><td>${phone || 'Not provided'}</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: 700; color: #64748b;">Order ID:</td><td>${orderId || 'N/A'}</td></tr>
                        </table>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; color: #0f172a; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #475569; display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Message:</strong>
                            ${message.replace(/\n/g, '<br/>')}
                        </div>
                    </div>
                    <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                        💡 <em>Clicking "Reply" to this email will respond directly to <strong>${name}</strong> (${email}).</em>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Contact inquiry from ${name} sent to ${targetAdminEmail}`);

        // Auto-reply confirmation to the customer
        const customerAckMail = {
            from: { name: "ESPARE HUB Support", address: process.env.NODEMAILER_EMAIL },
            to: email,
            subject: `We've received your message! — ESPARE HUB Support`,
            headers: INBOX_HEADERS,
            text: `Hi ${name},\n\nThank you for reaching out to ESPARE HUB. We have received your inquiry and our support team will reach out within 2 hours during working hours (Mon - Sat, 9:30 AM - 7:30 PM).\n\nYour message:\n"${message}"\n\nBest regards,\nESPARE HUB Support Team`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background: #0f172a; padding: 24px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">Message Received!</h2>
                    </div>
                    <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                        <p>Hi <strong>${name}</strong>,</p>
                        <p>Thank you for contacting <strong>ESPARE HUB Support</strong>. We have successfully received your inquiry.</p>
                        <p>Our technical support team will review your message and reach out to you within 2 hours during working hours (Monday – Saturday, 9:30 AM – 7:30 PM IST).</p>
                        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0; font-size: 13px; color: #334155;">
                            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Summary of your query:</strong>
                            ${message.replace(/\n/g, '<br/>')}
                        </div>
                        <p style="margin-bottom: 0;">Warm regards,<br/><strong>ESPARE HUB Support Team</strong></p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(customerAckMail).catch(err => console.warn("Customer auto-reply email warning:", err.message));

        return true;
    } catch (error) {
        console.error("❌ Failed to send contact inquiry email:", error.message);
        return false;
    }
};
