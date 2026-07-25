import bcrypt from "bcryptjs";
import Admin from "../../models/adminModel.js";
import Product from "../../models/productModel.js";
import Order from "../../models/ordersModel.js";
import ActivityLog from "../../models/activityLogModel.js";

export const createVendor = async (data) => {
  const { fullname, email, password, storeName, phone, address } = data;
  if (!fullname || !email || !password || !storeName) {
    throw new Error("Full name, email, password, and store name are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const existingVendor = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (existingVendor) {
    throw new Error("Email already registered.");
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const vendor = await Admin.create({
    fullname: fullname.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "vendor",
    status: "active",
    storeDetails: { storeName: storeName.trim(), phone: phone || "", address: address || "" },
  });
  const vendorData = vendor.toObject();
  delete vendorData.password;
  return vendorData;
};

export const getVendors = async () => {
  return await Admin.aggregate([
    { $match: { role: { $ne: 'owner' } } },
    {
      $lookup: {
        from: "orders",
        let: { vendorId: "$_id" },
        pipeline: [
          { $unwind: "$orderedItems" },
          { $match: { $expr: { $eq: ["$orderedItems.adminId", "$$vendorId"] }, "orderedItems.status": { $in: ['Delivered', 'Shipped', 'Out for Delivery'] } } },
          { $group: { _id: null, totalRevenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } } } }
        ],
        as: "revenueData"
      }
    },
    { $addFields: { totalRevenue: { $ifNull: [{ $arrayElemAt: ["$revenueData.totalRevenue", 0] }, 0] } } },
    { $project: { password: 0, revenueData: 0 } },
    { $sort: { createdAt: -1 } }
  ]);
};

export const bulkApproveVendors = async (vendorIds) => {
  if (!vendorIds || !Array.isArray(vendorIds)) throw new Error("Invalid vendor IDs.");
  return await Admin.updateMany({ _id: { $in: vendorIds }, role: "vendor" }, { status: "active" });
};

export const bulkBlockVendors = async (vendorIds) => {
  if (!vendorIds || !Array.isArray(vendorIds)) throw new Error("Invalid vendor IDs.");
  return await Admin.updateMany({ _id: { $in: vendorIds }, role: "vendor" }, { status: "blocked" });
};

export const bulkDeleteVendors = async (vendorIds) => {
  if (!vendorIds || !Array.isArray(vendorIds)) throw new Error("Invalid vendor IDs.");
  return await Admin.deleteMany({ _id: { $in: vendorIds }, role: "vendor" });
};

export const approveVendor = async (id) => {
  const vendor = await Admin.findById(id);
  if (!vendor) throw new Error('Vendor not found');
  vendor.status = 'active';
  return await vendor.save();
};

export const blockVendor = async (id) => {
  const vendor = await Admin.findById(id);
  if (!vendor) throw new Error('Vendor not found');
  vendor.status = vendor.status === 'blocked' ? 'active' : 'blocked';
  return await vendor.save();
};

export const deleteVendor = async (id) => {
  const vendor = await Admin.findById(id);
  if (!vendor) throw new Error('Vendor not found');
  await Product.deleteMany({ adminId: vendor._id });
  return await Admin.findByIdAndDelete(vendor._id);
};

export const updateVendorProfile = async (id, data) => {
  const vendor = await Admin.findOne({ _id: id, role: { $ne: 'owner' } });
  if (!vendor) throw new Error("Vendor not found");
  if (data.fullname) vendor.fullname = data.fullname;
  if (!vendor.storeDetails) vendor.storeDetails = {};
  if (data.storeName) vendor.storeDetails.storeName = data.storeName;
  if (data.address) vendor.storeDetails.address = data.address;
  return await vendor.save();
};

export const updateKycStatus = async (id, kycStatus) => {
  const vendor = await Admin.findOne({ _id: id, role: { $ne: 'owner' } });
  if (!vendor) throw new Error("Vendor not found");
  if (["unverified", "pending", "verified"].includes(kycStatus)) {
    vendor.kycStatus = kycStatus;
    await vendor.save();
  }
  return vendor;
};

export const resetVendorPassword = async (id, password) => {
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");
  const vendor = await Admin.findOne({ _id: id, role: "vendor" });
  if (!vendor) throw new Error("Vendor not found");
  const salt = await bcrypt.genSalt(10);
  vendor.password = await bcrypt.hash(password, salt);
  vendor.status = vendor.status === "blocked" ? "blocked" : "active";
  return await vendor.save();
};

export const updateVendorPhone = async (id, phone) => {
  if (!phone || phone.length < 10) throw new Error("Invalid phone number.");
  const vendor = await Admin.findOne({ _id: id, role: { $ne: 'owner' } });
  if (!vendor) throw new Error("Vendor not found");
  if (!vendor.storeDetails) vendor.storeDetails = {};
  vendor.storeDetails.phone = phone;
  return await vendor.save();
};

export const vendorStats = async (id) => {
  const vendor = await Admin.findById(id).select("-password").lean();
  if (!vendor) throw new Error("Vendor not found");
  const totalRevenueAggr = await Order.aggregate([
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.adminId": vendor._id, "orderedItems.status": { $in: ['Delivered', 'Shipped', 'Out for Delivery'] } } },
    { $group: { _id: null, total: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } } } }
  ]);
  const totalRevenue = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].total : 0;
  const totalProducts = await Product.countDocuments({ adminId: vendor._id });
  const activities = await ActivityLog.find({ adminId: vendor._id }).sort({ createdAt: -1 }).limit(10).lean();
  return { vendor, stats: { totalRevenue, totalProducts, joinedAt: vendor.createdAt }, activities };
};

export const vendorProducts = async (id, queryParams) => {
  const query = { adminId: id };
  if (queryParams.search) query.name = { $regex: queryParams.search, $options: "i" };
  const products = await Product.find(query)
    .populate("category_id", "name")
    .sort({ createdAt: -1 })
    .lean();
  return products.map(p => ({
    ...p,
    totalStock: Array.isArray(p.variants) ? p.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) : 0,
    price: Array.isArray(p.variants) && p.variants.length > 0 ? p.variants[0].price : 0
  }));
};

export const clearVendorActivities = async (id) => {
  return await ActivityLog.deleteMany({ adminId: id });
};
