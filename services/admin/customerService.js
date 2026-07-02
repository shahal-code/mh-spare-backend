import User from "../../models/userModel.js";


//  Get all users with pagination and search using aggregation.

export const getAllUsers = async (query, page, limit) => {
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  return {
    users,
    totalUsers,
    totalPages
  };
};

// customer summary stats (counts)

export const getCustomerStats = async ()=>{
  const totalCount=await User.countDocuments();
  const blockedUsers = await User.countDocuments({ isBlocked: true });
  const activeUsers = await User.countDocuments({ isBlocked: false });
  return{
    total:totalCount,
    newThisMonth:0,
    blockedUsers,
    activeUsers
  };
};



 // Toggle user block status.
 
export const toggleBlockStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }
  user.isBlocked = !user.isBlocked;
  return await user.save();
};
