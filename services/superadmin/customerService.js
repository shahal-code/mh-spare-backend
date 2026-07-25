import User from "../../models/userModel.js";
import Wallet from "../../models/walletModel.js";
import Address from "../../models/addressModel.js";
import Order from "../../models/ordersModel.js";

//  Get all users with pagination and search using aggregation.
export const getAllUsers = async (queryParams, page, limit) => {
  let dbQuery = {};

  if (queryParams.search) {
    dbQuery.$or = [
      { fullname: { $regex: queryParams.search, $options: "i" } },
      { email: { $regex: queryParams.search, $options: "i" } },
      { phone: { $regex: queryParams.search, $options: "i" } },
    ];
  }
  if (queryParams.status) {
    dbQuery.isBlocked = queryParams.status === 'blocked';
  }
  if (queryParams.startDate) {
    dbQuery.createdAt = { $gte: new Date(queryParams.startDate) };
  }

  const users = await User.find(dbQuery)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const totalUsers = await User.countDocuments(dbQuery);
  const totalPages = Math.ceil(totalUsers / limit);

  return { users, totalUsers, totalPages };
};

// customer summary stats (counts)
export const getCustomerStats = async () => {
  const totalCount = await User.countDocuments();
  const blockedUsers = await User.countDocuments({ isBlocked: true });
  const activeUsers = await User.countDocuments({ isBlocked: false });
  return {
    total: totalCount,
    newThisMonth: 0,
    blockedUsers,
    activeUsers
  };
};

export const toggleBlockStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }
  user.isBlocked = !user.isBlocked;
  return await user.save();
};

export const bulkToggleUsers = async ({ userIds, action, selectAll, filters }) => {
  if (action !== "block" && action !== "unblock") {
    throw new Error("Invalid action. Must be 'block' or 'unblock'.");
  }
  let query = {};
  if (selectAll) {
    if (filters?.search) {
      query.$or = [
        { fullname: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } },
      ];
    }
    if (filters?.status) query.isBlocked = filters.status === 'blocked';
    if (filters?.startDate) query.createdAt = { $gte: new Date(filters.startDate) };
  } else {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("Invalid or empty user IDs array.");
    }
    query._id = { $in: userIds };
  }
  
  const result = await User.updateMany(query, { $set: { isBlocked: action === "block" } });
  return { success: true, message: `Successfully ${action}ed ${result.modifiedCount} customers.` };
};

export const getUserDetails = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) throw new Error("User not found");
  
  const wallet = await Wallet.findOne({ userId: id }).lean();
  let address = await Address.findOne({ user_id: id, is_default: true }).lean();
  if (!address) {
    address = await Address.findOne({ user_id: id }).lean();
  }
  
  const orders = await Order.find({ userId: id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
  const totalSpent = await Order.aggregate([
    { $match: { userId: user._id, status: { $nin: ['Cancelled', 'Returned'] } } },
    { $group: { _id: null, total: { $sum: "$finalAmount" } } }
  ]);
  
  return {
    user,
    address,
    walletBalance: wallet ? wallet.balance : 0,
    totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
    recentOrders: orders
  };
};
