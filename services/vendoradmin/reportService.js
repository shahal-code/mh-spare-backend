import Order from "../../models/ordersModel.js";
import Admin from "../../models/adminModel.js";
import User from "../../models/userModel.js";

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
function calculateOrderAmounts(o, adminId = null) {
    if (o.status === "Cancelled" || o.status === "Returned") {
        return { totalAmount: 0, discount: 0, finalAmount: 0 };
    }

    const items = o.orderedItems || [];
    let sumOfAllItems = 0;
    let sumOfActiveItems = 0;
    let sumOfInactiveItems = 0;

    items.forEach(item => {
        if (adminId && item.adminId?.toString() !== adminId.toString()) {
            return; // Skip items that don't belong to this vendor
        }

        const itemVal = (item.price || 0) * (item.quantity || 0);
        sumOfAllItems += itemVal;
        if (item.status === "Cancelled" || item.status === "Returned") {
            sumOfInactiveItems += itemVal;
        } else {
            sumOfActiveItems += itemVal;
        }
    });

    if (sumOfActiveItems === 0) {
        return { totalAmount: 0, discount: 0, finalAmount: 0 };
    }

    if (adminId) {
        return {
            totalAmount: Math.round(sumOfActiveItems),
            discount: 0,
            finalAmount: Math.round(sumOfActiveItems)
        };
    }

    if (sumOfInactiveItems === 0) {
        return {
            totalAmount: o.totalPrice || 0,
            discount: o.discount || 0,
            finalAmount: o.finalAmount || 0
        };
    }

    if (Math.abs((o.totalPrice || 0) - sumOfActiveItems) < 1) {
        return {
            totalAmount: o.totalPrice || 0,
            discount: o.discount || 0,
            finalAmount: o.finalAmount || 0
        };
    }

    const ratio = sumOfActiveItems / sumOfAllItems;
    return {
        totalAmount: Math.round(sumOfActiveItems),
        discount: Math.round((o.discount || 0) * ratio),
        finalAmount: Math.round((o.finalAmount || 0) * ratio)
    };
}

function getChartKey(d, groupBy) {
    if (groupBy === "hour")       return `${d.getHours()}:00`;
    if (groupBy === "dayOfWeek")  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    if (groupBy === "dayOfMonth") return `${d.getDate()}`;
    if (groupBy === "month")      return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Main Report Service
 */
export const getReportData = async (filter = "today", start = null, end = null, page = 1, admin = null, reportType = "sales") => {
    const { startDate, endDate } = buildDateRange(filter, start, end);
    let finalReportType = reportType;

    const query = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    if (admin && admin.role === "vendor") {
        query["orderedItems.adminId"] = admin.id;
        finalReportType = "sales";
    }

    const allRawOrders = await Order.find(query)
        .populate("userId", "fullname email")
        .populate("orderedItems.product", "name")
        .lean();
    
    const allOrders = allRawOrders.map(o => {
        const amounts = calculateOrderAmounts(o, admin?.role === "vendor" ? admin.id : null);
        return { ...o, ...amounts };
    });

    const { labels, groupBy } = buildChartConfig(filter, startDate, endDate);
    const revenueMap  = {};
    const discountMap = {};
    labels.forEach(l => { revenueMap[l] = 0; discountMap[l] = 0; });

    const totalRevenue  = allOrders.reduce((s, o) => s + (o.totalAmount  || 0), 0);
    const totalDiscount = allOrders.reduce((s, o) => s + (o.discount     || 0), 0);
    const netRevenue    = allOrders.reduce((s, o) => s + (o.finalAmount  || 0), 0);
    
    const limit = 5;
    const skip = (page - 1) * limit;

    let responseData = {
        totalRevenue:  Math.round(totalRevenue),
        totalDiscount: Math.round(totalDiscount),
        netRevenue:    Math.round(netRevenue),
        chartLabels:   labels,
        filter, startDate: start, endDate: end, currentPage: page,
        reportType: finalReportType
    };

    if (finalReportType === "products") {
        const productMap = {};

        allOrders.forEach(order => {
            if (!order.orderedItems) return;
            
            const key = getChartKey(new Date(order.createdAt), groupBy);
            if (revenueMap[key] !== undefined) revenueMap[key] += order.finalAmount || 0;
            if (discountMap[key] !== undefined) discountMap[key] += order.discount || 0;

            order.orderedItems.forEach(item => {
                if (admin && admin.role === "vendor" && item.adminId?.toString() !== admin.id) return;

                const pId = item.product?._id?.toString();
                if (pId) {
                    if (!productMap[pId]) {
                        productMap[pId] = {
                            _id: pId,
                            name: item.product.name || "Unknown Product",
                            itemsSold: 0,
                            revenue: 0,
                            returns: 0
                        };
                    }
                    if (item.status === "Returned" || item.status === "Return Request") {
                        productMap[pId].returns += (item.quantity || 1);
                    } else if (item.status !== "Cancelled") {
                        productMap[pId].itemsSold += (item.quantity || 1);
                        productMap[pId].revenue += ((item.price || 0) * (item.quantity || 1));
                    }
                }
            });
        });

        const activeProductsList = Object.values(productMap).sort((a, b) => b.itemsSold - a.itemsSold);
        const totalItems = activeProductsList.length;
        const totalPages = Math.ceil(totalItems / limit) || 1;
        const paginated = activeProductsList.slice(skip, skip + limit);

        responseData.orders = paginated;
        responseData.allReportOrders = activeProductsList;
        responseData.totalOrders = totalItems; // Total unique products sold
        responseData.totalPages = totalPages;
        responseData.chartRevenue = labels.map(l => revenueMap[l] || 0);
        responseData.chartDiscount = labels.map(l => discountMap[l] || 0);
    } else if (finalReportType === "vendors") {
        const vendors = await Admin.find({ role: "vendor" }).lean();
        const vendorMap = {};
        vendors.forEach(v => {
            vendorMap[v._id.toString()] = {
                _id: v._id,
                name: v.fullname || v.storeDetails?.storeName || 'Unknown',
                store: v.storeDetails?.storeName || '',
                totalOrders: 0,
                itemsSold: 0,
                totalRevenue: 0
            };
        });

        allOrders.forEach(order => {
            if (!order.orderedItems) return;
            const orderVendors = new Set();
            order.orderedItems.forEach(item => {
                if (item.status === "Cancelled" || item.status === "Returned") return;
                const vId = item.adminId?.toString();
                if (vId && vendorMap[vId]) {
                    orderVendors.add(vId);
                    vendorMap[vId].itemsSold += (item.quantity || 1);
                    vendorMap[vId].totalRevenue += ((item.price || 0) * (item.quantity || 1));
                    
                    const key = getChartKey(new Date(order.createdAt), groupBy);
                    if (revenueMap[key] !== undefined) revenueMap[key] += ((item.price || 0) * (item.quantity || 1));
                }
            });
            orderVendors.forEach(vId => {
                vendorMap[vId].totalOrders += 1;
            });
        });

        const activeVendorsList = Object.values(vendorMap).filter(v => v.totalOrders > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        responseData.orders = activeVendorsList.slice(skip, skip + limit);
        responseData.allReportOrders = activeVendorsList;
        responseData.totalOrders = vendors.length; // Total vendors
        responseData.totalPages = Math.ceil(activeVendorsList.length / limit) || 1;
        responseData.chartRevenue = labels.map(l => revenueMap[l] || 0);
        responseData.chartDiscount = labels.map(l => 0); // No discount tracking for vendor aggregate right now
    } 
    else if (finalReportType === "customers") {
        const userMap = {};
        
        allOrders.forEach(order => {
            const key = getChartKey(new Date(order.createdAt), groupBy);
            if (revenueMap[key] !== undefined) revenueMap[key] += order.finalAmount || 0;
            if (discountMap[key] !== undefined) discountMap[key] += order.discount || 0;

            const uId = order.userId?._id?.toString();
            if (uId) {
                if (!userMap[uId]) {
                    userMap[uId] = {
                        _id: uId,
                        name: order.userId.fullname,
                        email: order.userId.email,
                        totalOrders: 0,
                        totalSpend: 0
                    };
                }
                userMap[uId].totalOrders += 1;
                userMap[uId].totalSpend += (order.finalAmount || 0);
            }
        });

        const activeUsersList = Object.values(userMap).sort((a, b) => b.totalSpend - a.totalSpend);
        const usersCount = await User.countDocuments({ createdAt: { $lte: endDate } });

        responseData.orders = activeUsersList.slice(skip, skip + limit);
        responseData.allReportOrders = activeUsersList;
        responseData.totalOrders = usersCount; // Total users
        responseData.totalPages = Math.ceil(activeUsersList.length / limit) || 1;
        responseData.chartRevenue = labels.map(l => revenueMap[l] || 0);
        responseData.chartDiscount = labels.map(l => discountMap[l] || 0);
    } 
    else {
        // SALES REPORT
        allOrders.forEach(order => {
            const key = getChartKey(new Date(order.createdAt), groupBy);
            if (revenueMap[key] !== undefined) revenueMap[key] += order.finalAmount || 0;
            if (discountMap[key] !== undefined) discountMap[key] += order.discount || 0;
        });

        const paginatedRawOrders = await Order.find(query)
            .populate("userId", "fullname email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const paginatedOrders = paginatedRawOrders.map(o => {
            const amounts = calculateOrderAmounts(o, admin?.role === "vendor" ? admin.id : null);
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

        responseData.orders = paginatedOrders;
        responseData.allReportOrders = allReportOrders;
        responseData.totalOrders = allOrders.length;
        responseData.totalPages = Math.ceil(allOrders.length / limit) || 1;
        responseData.chartRevenue = labels.map(l => revenueMap[l] || 0);
        responseData.chartDiscount = labels.map(l => discountMap[l] || 0);
    }

    return responseData;
};
