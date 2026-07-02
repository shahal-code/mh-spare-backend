import Order from "../../models/ordersModel.js";

/**
 * Build start/end Date objects based on filter string
 */
function buildDateRange(filter, start, end) {
    const now = new Date();
    let startDate, endDate;

    switch (filter) {
        case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case "weekly":
            const day  = now.getDay(); // 0 = Sun
            startDate  = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
            endDate    = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case "yearly":
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
            endDate   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case "custom":
            startDate = start ? new Date(start + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
            endDate   = end   ? new Date(end   + "T23:59:59") : new Date();
            break;
        default:
            // Default to today
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return { startDate, endDate };
}

/**
 * Build chart labels and group key based on filter
 */
function buildChartConfig(filter, startDate, endDate) {
    const labels   = [];
    const groupFmt = {};

    if (filter === "today") {
        // Hourly 0-23
        for (let h = 0; h < 24; h++) {
            labels.push(`${h}:00`);
        }
        return { labels, groupBy: "hour" };
    }

    if (filter === "weekly") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return { labels: days, groupBy: "dayOfWeek" };
    }

    if (filter === "monthly") {
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) labels.push(`${d}`);
        return { labels, groupBy: "dayOfMonth" };
    }

    if (filter === "yearly") {
        return { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], groupBy: "month" };
    }

    // Custom — day-by-day
    const cur = new Date(startDate);
    while (cur <= endDate) {
        labels.push(`${cur.getDate()}/${cur.getMonth() + 1}`);
        cur.setDate(cur.getDate() + 1);
    }
    return { labels, groupBy: "date" };
}

/**
 * Calculate active totals for an order to accurately reflect refunds and returns
 */
function calculateOrderAmounts(o) {
    if (o.status === "Cancelled" || o.status === "Returned") {
        return {
            totalAmount: 0,
            discount: 0,
            finalAmount: 0
        };
    }

    const items = o.orderedItems || [];
    let sumOfAllItems = 0;
    let sumOfActiveItems = 0;
    let sumOfInactiveItems = 0;

    items.forEach(item => {
        const itemVal = (item.price || 0) * (item.quantity || 0);
        sumOfAllItems += itemVal;
        if (item.status === "Cancelled" || item.status === "Returned") {
            sumOfInactiveItems += itemVal;
        } else {
            sumOfActiveItems += itemVal;
        }
    });

    if (sumOfActiveItems === 0) {
        return {
            totalAmount: 0,
            discount: 0,
            finalAmount: 0
        };
    }

    if (sumOfInactiveItems === 0) {
        return {
            totalAmount: o.totalPrice || 0,
            discount: o.discount || 0,
            finalAmount: o.finalAmount || 0
        };
    }

    // Check if o.totalPrice in DB is already adjusted (e.g. by cancelOrderItem)
    if (Math.abs((o.totalPrice || 0) - sumOfActiveItems) < 1) {
        return {
            totalAmount: o.totalPrice || 0,
            discount: o.discount || 0,
            finalAmount: o.finalAmount || 0
        };
    }

    // Otherwise adjust proportionally
    const ratio = sumOfActiveItems / sumOfAllItems;
    return {
        totalAmount: Math.round(sumOfActiveItems),
        discount: Math.round((o.discount || 0) * ratio),
        finalAmount: Math.round((o.finalAmount || 0) * ratio)
    };
}

/**
 * Main Report Service
 */
export const getReportData = async (filter = "today", start = null, end = null, page = 1) => {
    const { startDate, endDate } = buildDateRange(filter, start, end);

    const query = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    // Fetch all orders in range for totals, charts, and exports
    const allRawOrders = await Order.find(query)
        .populate("userId", "fullname email")
        .lean();

    const allOrders = allRawOrders.map(o => {
        const amounts = calculateOrderAmounts(o);
        return {
            ...o,
            ...amounts
        };
    });

    // Summary totals
    const totalOrders   = allOrders.length;
    const totalRevenue  = allOrders.reduce((s, o) => s + (o.totalAmount  || 0), 0);
    const totalDiscount = allOrders.reduce((s, o) => s + (o.discount     || 0), 0);
    const netRevenue    = allOrders.reduce((s, o) => s + (o.finalAmount  || 0), 0);

    // Chart data
    const { labels, groupBy } = buildChartConfig(filter, startDate, endDate);
    const revenueMap  = {};
    const discountMap = {};
    labels.forEach(l => { revenueMap[l] = 0; discountMap[l] = 0; });

    allOrders.forEach(order => {
        const d = new Date(order.createdAt);
        let key;

        if (groupBy === "hour")       key = `${d.getHours()}:00`;
        else if (groupBy === "dayOfWeek") key = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
        else if (groupBy === "dayOfMonth") key = `${d.getDate()}`;
        else if (groupBy === "month") key = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
        else key = `${d.getDate()}/${d.getMonth() + 1}`;

        if (revenueMap[key]  !== undefined) revenueMap[key]  += order.finalAmount || 0;
        if (discountMap[key] !== undefined) discountMap[key] += order.discount    || 0;
    });

    const chartRevenue  = labels.map(l => revenueMap[l]  || 0);
    const chartDiscount = labels.map(l => discountMap[l] || 0);

    const limit = 10;
    const totalPages = Math.ceil(totalOrders / limit);
    const skip = (page - 1) * limit;

    // Fetch paginated orders
    const paginatedRawOrders = await Order.find(query)
        .populate("userId", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Normalize paginated orders to match EJS template field names
    const paginatedOrders = paginatedRawOrders.map(o => {
        const amounts = calculateOrderAmounts(o);
        return {
            _id:         o._id,
            orderId:     o.orderId,
            createdAt:   o.createdAt,
            userId:      o.userId,
            status:      o.status,
            totalAmount: amounts.totalAmount,
            discount:    amounts.discount,
            finalAmount: amounts.finalAmount,
            couponCode:  o.couponCode  || null,
            paymentMethod: o.paymentMethod
        };
    });

    // Format all report orders for frontend export
    const allReportOrders = allOrders.map(o => ({
        orderId:     o.orderId,
        createdAt:   o.createdAt,
        customerName: o.userId ? o.userId.fullname || 'Guest' : 'Guest',
        status:      o.status,
        totalAmount: o.totalAmount,
        discount:    o.discount,
        finalAmount: o.finalAmount,
        couponCode:  o.couponCode || null
    }));

    return {
        orders: paginatedOrders,
        totalOrders,
        totalRevenue:  Math.round(totalRevenue),
        totalDiscount: Math.round(totalDiscount),
        netRevenue:    Math.round(netRevenue),
        chartLabels:   labels,
        chartRevenue,
        chartDiscount,
        allReportOrders,
        filter,
        startDate: start,
        endDate:   end,
        currentPage: page,
        totalPages
    };
};
