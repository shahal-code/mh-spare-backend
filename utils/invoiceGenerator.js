import PDFDocument from "pdfkit";

export const generateInvoice = (res, order) => {
    const doc = new PDFDocument({ margin: 50 });

    // Header
    doc.fillColor("#0055ff")
       .fontSize(24)
       .text("TECHKART", 50, 45)
       .fillColor("#444444")
       .fontSize(10)
       .text("Tax Invoice / Bill of Supply", 200, 50, { align: "right" })
       .text("Order ID: " + order.orderId, 200, 65, { align: "right" })
       .text("Date: " + new Date(order.createdAt).toLocaleDateString(), 200, 80, { align: "right" });

    // Status Indicator
    let statusColor = "#f59e0b"; // Pending
    if (order.status === 'Delivered') statusColor = "#10b981";
    else if (order.status === 'Cancelled' || order.status === 'Returned') statusColor = "#ef4444";
    else if (order.status === 'Shipped') statusColor = "#6366f1";
    else if (order.status === 'Out for Delivery') statusColor = "#3b82f6";

    doc.fillColor(statusColor)
       .font("Helvetica-Bold")
       .text("Status: " + order.status.toUpperCase(), 200, 95, { align: "right" })
       .font("Helvetica")
       .moveDown();

    doc.moveTo(50, 100).lineTo(550, 100).stroke();

    // Sender and Receiver Info
    doc.fontSize(12).fillColor("#000")
       .text("Sold By:", 50, 120, { underline: true })
       .fontSize(10)
       .text("TechKart E-commerce Solutions", 50, 135)
       .text("123 Tech Park, Silicon Valley", 50, 150)
       .text("Bangalore, KA, 560001", 50, 165)
       .text("GSTIN: 29AAAAA0000A1Z5", 50, 180);

    doc.fontSize(12)
       .text("Shipping Address:", 300, 120, { underline: true })
       .fontSize(10)
       .text(order.shippingAddress.fullname, 300, 135)
       .text(order.shippingAddress.line1, 300, 150)
       .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 300, 165)
       .text(`PIN: ${order.shippingAddress.postal_code}`, 300, 180)
       .text(`Phone: ${order.shippingAddress.phone}`, 300, 195);

    doc.moveTo(50, 220).lineTo(550, 220).stroke();

    // Table Header
    const tableTop = 240;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Item Description", 50, tableTop);
    doc.text("Price", 280, tableTop, { width: 90, align: "right" });
    doc.text("Qty", 370, tableTop, { width: 50, align: "right" });
    doc.text("Tax (18%)", 420, tableTop, { width: 60, align: "right" });
    doc.text("Amount", 480, tableTop, { width: 70, align: "right" });

    doc.moveTo(50, 255).lineTo(550, 255).stroke();

    // Table Content
    let i = 0;
    doc.font("Helvetica").fontSize(10);
    order.orderedItems.forEach(item => {
        // Do not display cancelled or returned items on the final invoice
        if (item.status === 'Cancelled' || item.status === 'Returned') return;

        const y = 270 + (i * 30);
        const variant = item.product?.variants?.find(v => v._id.toString() === item.variantId.toString());
        const tax = item.price * item.quantity * 0.18;
        const lineTotal = (item.price * item.quantity) + tax;

        doc.text(`${item.product?.name || 'Unknown Product'} (${variant?.color || 'N/A'})`, 50, y);
        doc.text(`₹${item.price.toLocaleString()}`, 280, y, { width: 90, align: "right" });
        doc.text(item.quantity.toString(), 370, y, { width: 50, align: "right" });
        doc.text(`₹${tax.toLocaleString()}`, 420, y, { width: 60, align: "right" });
        doc.text(`₹${lineTotal.toLocaleString()}`, 480, y, { width: 70, align: "right" });
        i++;
    });

    // Calculate Dynamic Totals (retroactive fix for old orders)
    let activeSubtotal = 0;
    order.orderedItems.forEach(item => {
        if (item.status !== 'Cancelled' && item.status !== 'Returned') {
            activeSubtotal += item.price * item.quantity;
        }
    });
    const activeTax = activeSubtotal * 0.18;
    const activeDiscount = order.discount || 0;
    let activeTotalAmount = activeSubtotal + activeTax - activeDiscount;
    if (activeTotalAmount < 0) activeTotalAmount = 0;

    // Totals
    const summaryTop = 270 + (i * 30) + 30;
    doc.moveTo(350, summaryTop).lineTo(550, summaryTop).stroke();

    doc.font("Helvetica-Bold")
       .text("Subtotal:", 350, summaryTop + 10)
       .text(`₹${activeSubtotal.toLocaleString()}`, 480, summaryTop + 10, { width: 70, align: "right" });

    doc.text("GST (18%):", 350, summaryTop + 25)
       .text(`₹${activeTax.toLocaleString()}`, 480, summaryTop + 25, { width: 70, align: "right" });

    if (activeDiscount > 0) {
        doc.text("Discount:", 350, summaryTop + 40)
           .text(`-₹${activeDiscount.toLocaleString()}`, 480, summaryTop + 40, { width: 70, align: "right" });
    }

    doc.fontSize(14).fillColor("#0055ff")
       .text("Total Amount:", 350, summaryTop + 60)
       .text(`₹${activeTotalAmount.toLocaleString()}`, 480, summaryTop + 60, { width: 70, align: "right" });

    // Footer
    doc.fontSize(10).fillColor("#999")
       .text("This is a computer generated invoice and does not require a physical signature.", 50, 700, { align: "center", width: 500 });

    doc.pipe(res);
    doc.end();
};
