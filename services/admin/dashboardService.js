import Order from "../../models/ordersModel.js";
import User from "../../models/userModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const getDashboardStats = async () => {
  try {
    const validStatuses = ['Delivered', 'Shipped', 'Out for Delivery'];

    // Basic Stats
    const totalRevenueAggr = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } }
    ]);
    const totalRevenue = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].total : 0;
    
    const totalOrders = await Order.countDocuments({ status: { $in: validStatuses } });
    const totalUsers = await User.countDocuments({});
    const totalProducts = await Product.countDocuments({ is_blocked: false });

    // Top 10 Products
    const topProducts = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $unwind: "$orderedItems" },
      { $group: { _id: "$orderedItems.product", totalQuantity: { $sum: "$orderedItems.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" },
      { $project: { name: "$productDetails.name", totalQuantity: 1, _id: 0 } }
    ]);

    // Top 10 Categories
    const topCategories = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $unwind: "$orderedItems" },
      { $lookup: { from: "products", localField: "orderedItems.product", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" },
      { $group: { _id: "$productDetails.category_id", totalQuantity: { $sum: "$orderedItems.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryDetails" } },
      { $unwind: "$categoryDetails" },
      { $project: { name: "$categoryDetails.name", totalQuantity: 1, _id: 0 } }
    ]);

    // Top 10 Brands (Extracting first word of product name as brand)
    const topBrands = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $unwind: "$orderedItems" },
      { $lookup: { from: "products", localField: "orderedItems.product", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" },
      { $addFields: { brandName: { $arrayElemAt: [{ $split: ["$productDetails.name", " "] }, 0] } } },
      { $group: { _id: "$brandName", totalQuantity: { $sum: "$orderedItems.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $project: { name: "$_id", totalQuantity: 1, _id: 0 } }
    ]);

    return {
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
      topProducts,
      topCategories,
      topBrands,
      activePage: "dashboard",
      pageTitle: "Global Overview",
      pageSubtitle: "Real-time Admin Statistics"
    };
  } catch (error) {
    console.error("Dashboard Service Error:", error);
    throw error;
  }
};

export const getChartData = async (filter) => {
  try {
    const validStatuses = ['Delivered', 'Shipped', 'Out for Delivery'];
    let startDate;
    let groupFormat;
    let labels = [];
    
    const now = new Date();
    
    if (filter === 'yearly') {
      // Last 5 years
      startDate = new Date(now.getFullYear() - 4, 0, 1);
      groupFormat = "%Y";
      for (let i = 4; i >= 0; i--) {
        labels.push((now.getFullYear() - i).toString());
      }
    } else if (filter === 'weekly') {
      // Last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = "%Y-%m-%d";
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
      }
    } else {
      // Monthly - Default to last 12 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = "%Y-%m";
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        labels.push(`${year}-${month}`);
      }
    }

    const salesData = await Order.aggregate([
      { 
        $match: { 
          status: { $in: validStatuses },
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          totalRevenue: { $sum: "$finalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing labels with 0
    let revenueData = [];
    labels.forEach(label => {
      let labelMatch = label;
      if (filter === 'monthly' && labelMatch.length > 7) {
        labelMatch = labelMatch.substring(0, 7); // Handle YYYY-MM
      }
      
      const found = salesData.find(s => s._id === labelMatch);
      revenueData.push(found ? found.totalRevenue : 0);
    });

    // Format labels for display
    if (filter === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels = labels.map(l => {
        const d = new Date(l);
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
      });
    } else if (filter === 'monthly') {
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
