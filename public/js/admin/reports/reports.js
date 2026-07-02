document.addEventListener('DOMContentLoaded', () => {
    // ─── Chart.js ──────────────────────────────────────────────────
    const ctx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: typeof chartLabels !== 'undefined' ? chartLabels : [],
            datasets: [
                {
                    label: 'Revenue',
                    data: typeof chartRevenue !== 'undefined' ? chartRevenue : [],
                    borderColor: '#0055ff',
                    backgroundColor: 'rgba(0,85,255,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0055ff',
                    borderWidth: 2,
                },
                {
                    label: 'Discounts',
                    data: typeof chartDiscount !== 'undefined' ? chartDiscount : [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.06)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f59e0b',
                    borderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f1420',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    callbacks: {
                        label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 10 } } },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { size: 10 }, callback: v => '₹' + v.toLocaleString('en-IN') }
                }
            }
        }
    });

    // ─── Restore active filter tab from URL ────────────────────────
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f) {
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === f);
        });
        if (f === 'custom') {
            document.getElementById('customDateRange').classList.remove('hidden');
            document.getElementById('periodLabel').classList.add('hidden');
            document.getElementById('startDate').value = params.get('start') || '';
            document.getElementById('endDate').value   = params.get('end') || '';
        }
    }
});

// ─── Filter Tabs ───────────────────────────────────────────────
function setFilter(btn, filter) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const customRange = document.getElementById('customDateRange');
    const periodLabel = document.getElementById('periodLabel');
    const periodText  = document.getElementById('periodText');

    if (filter === 'custom') {
        customRange.classList.remove('hidden');
        periodLabel.classList.add('hidden');
    } else {
        customRange.classList.add('hidden');
        periodLabel.classList.remove('hidden');
        const labels = { today: 'Today', weekly: 'This Week', monthly: 'This Month', yearly: 'This Year' };
        periodText.textContent = labels[filter] || filter;
        window.location.href = `/admin/reports?filter=${filter}`;
    }
}

function applyCustomFilter() {
    const start = document.getElementById('startDate').value;
    const end   = document.getElementById('endDate').value;
    if (!start || !end) {
        return Swal.fire({ icon: 'warning', title: 'Select Dates', text: 'Please pick both a start and end date.', background: '#0f1420', color: '#fff' });
    }
    if (new Date(start) > new Date(end)) {
        return Swal.fire({ icon: 'warning', title: 'Invalid Range', text: 'Start date cannot be after end date.', background: '#0f1420', color: '#fff' });
    }
    window.location.href = `/admin/reports?filter=custom&start=${start}&end=${end}`;
}

// ─── Table Search ──────────────────────────────────────────────
function filterTable() {
    const q = document.getElementById('tableSearch').value.toLowerCase();
    document.querySelectorAll('#reportTableBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

function getFilteredReportOrders() {
    const q = (document.getElementById('tableSearch')?.value || '').toLowerCase().trim();
    if (typeof allReportOrders === 'undefined') return [];
    if (!q) {
        return allReportOrders;
    }
    return allReportOrders.filter(o => {
        const orderIdStr = (o.orderId || '').toLowerCase();
        const customerStr = (o.customerName || '').toLowerCase();
        const statusStr = (o.status || '').toLowerCase();
        const couponStr = (o.couponCode || '').toLowerCase();
        return orderIdStr.includes(q) ||
               customerStr.includes(q) ||
               statusStr.includes(q) ||
               couponStr.includes(q);
    });
}

// ─── Excel Download ────────────────────────────────────────────
function downloadExcel() {
    const ordersToExport = getFilteredReportOrders();
    const rows = [['#','Order ID','Date','Customer','Status','Order Amount','Coupon','Discount','Net Amount']];
    ordersToExport.forEach((order, idx) => {
        rows.push([
            idx + 1,
            `#${order.orderId.toUpperCase()}`,
            new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            order.customerName,
            order.status,
            order.totalAmount.toLocaleString('en-IN'),
            order.couponCode || '—',
            order.discount > 0 ? `-${order.discount.toLocaleString('en-IN')}` : '—',
            order.finalAmount.toLocaleString('en-IN')
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `TechKart_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ─── PDF Download ──────────────────────────────────────────────
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // Dark grey title
    doc.text('TechKart - Sales Report', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 26);

    const head = [['#','Order ID','Date','Customer','Status','Order Amount','Coupon','Discount','Net Amount']];
    const ordersToExport = getFilteredReportOrders();
    const body = [];
    let exportTotalOrders = ordersToExport.length;
    let exportTotalDiscount = 0;
    let exportNetRevenue = 0;

    ordersToExport.forEach((order, idx) => {
        exportTotalDiscount += (order.discount || 0);
        exportNetRevenue += (order.finalAmount || 0);

        body.push([
            idx + 1,
            `#${order.orderId.toUpperCase()}`,
            new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            order.customerName,
            order.status,
            order.totalAmount.toLocaleString('en-IN'),
            order.couponCode || '—',
            order.discount > 0 ? `-${order.discount.toLocaleString('en-IN')}` : '—',
            order.finalAmount.toLocaleString('en-IN')
        ]);
    });

    doc.autoTable({
        head,
        body,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59], lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
            if (data.row.section === 'body' && data.column.index === 4) {
                const status = data.cell.text[0];
                if (status === 'Delivered') {
                    data.cell.styles.textColor = [16, 185, 129]; // Green
                    data.cell.styles.fontStyle = 'bold';
                } else if (status === 'Cancelled') {
                    data.cell.styles.textColor = [239, 68, 68]; // Red
                    data.cell.styles.fontStyle = 'bold';
                } else if (status === 'Returned') {
                    data.cell.styles.textColor = [245, 158, 11]; // Orange
                    data.cell.styles.fontStyle = 'bold';
                } else if (status === 'Shipped') {
                    data.cell.styles.textColor = [59, 130, 246]; // Blue
                    data.cell.styles.fontStyle = 'bold';
                } else if (status === 'Return Request' || status === 'Pending') {
                    data.cell.styles.textColor = [168, 85, 247]; // Purple
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Summary footer
    const pageHeight = doc.internal.pageSize.height;
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY + 15 > pageHeight) {
        doc.addPage();
        finalY = 20; // Start at the top of the new page
    }
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // Dark grey text
    doc.text(`Total Orders: ${exportTotalOrders}`, 14, finalY);
    doc.text(`Net Revenue: ₹${exportNetRevenue.toLocaleString('en-IN')}`, 80, finalY);
    doc.text(`Total Discount: ₹${exportTotalDiscount.toLocaleString('en-IN')}`, 160, finalY);

    doc.save(`TechKart_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
