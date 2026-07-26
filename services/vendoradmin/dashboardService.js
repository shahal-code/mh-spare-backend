import mongoose from "mongoose";
import Order from "../../models/ordersModel.js";
import User from "../../models/userModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Admin from "../../models/adminModel.js";
import Payout from "../../models/payoutModel.js";

export const getDashboardStats = async (adminContext = null) => {
  try {
    const validStatuses = ['Delivered', 'Shipped', 'Out for Delivery'];
    
    // Match query for orders
    const matchQuery = { status: { $in: validStatuses } };
    
    // If not owner, only look at orders containing this admin's items
    if (adminContext && adminContext.role !== 'owner') {
      matchQuery["orderedItems.adminId"] = adminContext._id;
    }

    // Basic Stats
    const totalRevenueAggr = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderedItems" },
      ...(adminContext && adminContext.role !== 'owner' ? [{ $match: { "orderedItems.adminId": adminContext._id } }] : []),
      { $match: { "orderedItems.status": { $in: validStatuses } } },
      { $group: { 
          _id: null, 
          total: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } },
          totalCommission: { $sum: "$orderedItems.commissionAmount" },
          totalVendorEarning: { $sum: "$orderedItems.vendorEarning" }
      } }
    ]);
    
    const totalRevenue = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].total : 0;
    const totalPlatformCommission = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].totalCommission : 0;
    const totalVendorEarnings = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].totalVendorEarning : 0;
    
    const totalOrders = await Order.countDocuments(matchQuery);
    const totalUsers = await User.countDocuments({});
    
    // Total products for vendor
    const productQuery = { is_blocked: false };
    if (adminContext && adminContext.role !== 'owner') {
      productQuery.adminId = adminContext._id;
    }
    const totalProducts = await Product.countDocuments(productQuery);

    // Top 10 Products
    const topProducts = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderedItems" },
      ...(adminContext && adminContext.role !== 'owner' ? [{ $match: { "orderedItems.adminId": adminContext._id } }] : []),
      { $match: { "orderedItems.status": { $in: validStatuses } } },
      { $group: { _id: "$orderedItems.product", totalQuantity: { $sum: "$orderedItems.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" },
      { $project: { name: "$productDetails.name", totalQuantity: 1, _id: 0 } }
    ]);

    // Top 10 Categories
    const topCategories = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderedItems" },
      ...(adminContext && adminContext.role !== 'owner' ? [{ $match: { "orderedItems.adminId": adminContext._id } }] : []),
      { $match: { "orderedItems.status": { $in: validStatuses } } },
      { $lookup: { from: "products", localField: "orderedItems.product", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" },
      { $group: { _id: "$productDetails.category_id", totalQuantity: { $sum: "$orderedItems.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryDetails" } },
      { $unwind: "$categoryDetails" },
      { $project: { name: "$categoryDetails.name", totalQuantity: 1, _id: 0 } }
    ]);

    // Recent Orders (Last 10)
    const recentOrders = await Order.aggregate([
      ...(adminContext && adminContext.role !== 'owner' ? [
        { $match: { "orderedItems.adminId": adminContext._id } }
      ] : []),
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      { $project: { name: "$orderId", totalQuantity: "$status", _id: 0 } }
    ]);
    const baseProductQuery = {};
    if (adminContext && adminContext.role !== 'owner') {
      baseProductQuery.adminId = adminContext._id;
    }
    
    // Low Stock Products (Total stock across variants < 10)
    const lowStockThreshold = 10;
    const lowStockProducts = await Product.aggregate([
      { $match: baseProductQuery },
      { $unwind: { path: "$variants", preserveNullAndEmptyArrays: true } },
      { $group: { 
          _id: "$_id", 
          name: { $first: "$name" }, 
          thumbnail: { $first: "$thumbnail" }, 
          totalStock: { $sum: { $ifNull: ["$variants.stock", 0] } } 
      } },
      { $match: { totalStock: { $lt: lowStockThreshold } } },
      { $sort: { totalStock: 1 } },
      { $limit: 10 }
    ]);

    // Product Status Breakdown
    const activeProducts = await Product.countDocuments({ ...baseProductQuery, approvalStatus: 'approved', is_blocked: false, is_unlisted: false });
    const pendingProducts = await Product.countDocuments({ ...baseProductQuery, approvalStatus: 'pending' });
    const draftProducts = await Product.countDocuments({ ...baseProductQuery, is_unlisted: true });
    
    const productStatusBreakdown = {
      active: activeProducts,
      pending: pendingProducts,
      draft: draftProducts
    };

    // Super Admin specific stats
    let superAdminStats = null;
    if (adminContext && adminContext.role === 'owner') {
      const vendors = await Admin.find({ role: 'vendor' });
      const totalVendors = vendors.length;
      const activeVendors = vendors.filter(v => v.status === 'active').length;
      const blockedVendors = vendors.filter(v => v.status === 'blocked').length;
      const pendingVendors = vendors.filter(v => v.status === 'pending').length;

      const currentMonth = new Date();
      currentMonth.setDate(1);
      const newVendorsThisMonth = vendors.filter(v => v.createdAt >= currentMonth).length;

      const payouts = await Payout.find();
      const totalVendorPayouts = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
      const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

      // Return/Refund stats
      const refundAggr = await Order.aggregate([
        { $match: { paymentStatus: { $in: ['Refunded', 'Partially Refunded'] } } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } } // Simplification: we might need more exact calculation for partials
      ]);
      const refundAmount = refundAggr.length > 0 ? refundAggr[0].total : 0;
      const returnOrders = await Order.countDocuments({ status: { $in: ['Return Request', 'Returned'] } });

      const vendorPerformance = await Order.aggregate([
        { $match: { status: { $in: validStatuses } } },
        { $unwind: "$orderedItems" },
        { $match: { "orderedItems.status": { $in: validStatuses } } },
        { $group: { 
            _id: "$orderedItems.adminId", 
            revenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } },
            itemsSold: { $sum: "$orderedItems.quantity" }
        } },
        { $lookup: { from: "admins", localField: "_id", foreignField: "_id", as: "vendor" } },
        { $unwind: "$vendor" },
        { $project: { name: "$vendor.fullname", storeName: "$vendor.storeDetails.storeName", revenue: 1, itemsSold: 1 } },
        { $sort: { revenue: -1 } }
      ]);
      const topSellingVendors = vendorPerformance.slice(0, 5);
      const lowestPerformingVendors = vendorPerformance.slice(-5).reverse();

      superAdminStats = {
        totalVendors, activeVendors, blockedVendors, pendingVendors, newVendorsThisMonth,
        totalVendorPayouts, pendingPayouts,
        refundAmount, returnOrders,
        topSellingVendors, lowestPerformingVendors,
        totalPlatformCommission, totalVendorEarnings
      };
    }

    return {
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
      topProducts,
      topCategories,
      recentOrders,
      lowStockProducts,
      productStatusBreakdown,
      superAdminStats,
      activePage: "dashboard",
      pageTitle: "Global Overview",
      pageSubtitle: "Real-time Admin Statistics"
    };
  } catch (error) {
    console.error("Dashboard Service Error:", error);
    throw error;
  }
};

export const getChartData = async (filter, adminContext = null) => {
  try {
    const validStatuses = ['Delivered', 'Shipped', 'Out for Delivery'];
    let startDate;
    let groupFormat;
    let labels = [];
    
    const now = new Date();
    
    if (filter === 'yearly') {
      startDate = new Date(now.getFullYear() - 4, 0, 1);
      groupFormat = "%Y";
      for (let i = 4; i >= 0; i--) {
        labels.push((now.getFullYear() - i).toString());
      }
    } else if (filter === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = "%Y-%m-%d";
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(d.toISOString().split('T')[0]); 
      }
    } else if (filter === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupFormat = "%Y-%m";
      const currentMonthIndex = now.getMonth();
      for (let i = 0; i <= currentMonthIndex; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        labels.push(`${year}-${month}`);
      }
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = "%Y-%m";
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        labels.push(`${year}-${month}`);
      }
    }

    const matchQuery = { 
      status: { $in: validStatuses },
      createdAt: { $gte: startDate }
    };

    if (adminContext && adminContext.role !== 'owner') {
      matchQuery["orderedItems.adminId"] = adminContext._id;
    }

    const salesData = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderedItems" },
      ...(adminContext && adminContext.role !== 'owner' ? [{ $match: { "orderedItems.adminId": adminContext._id } }] : []),
      { $match: { "orderedItems.status": { $in: validStatuses } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          totalRevenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    let revenueData = [];
    labels.forEach(label => {
      let labelMatch = label;
      if ((filter === 'monthly' || filter === 'this_year') && labelMatch.length > 7) {
        labelMatch = labelMatch.substring(0, 7); 
      }
      
      const found = salesData.find(s => s._id === labelMatch);
      revenueData.push(found ? found.totalRevenue : 0);
    });

    if (filter === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels = labels.map(l => {
        const d = new Date(l);
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
      });
    } else if (filter === 'monthly' || filter === 'this_year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels = labels.map(l => {
        const [year, month] = l.split('-');
        return `${months[parseInt(month) - 1]} ${year}`;
      });
    }

    return { labels, revenueData };
  } catch (error) {
    console.error("Chart Data Error:", error);
    throw error;
  }
};
