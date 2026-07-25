import Admin from "../../models/adminModel.js";
import Order from "../../models/ordersModel.js";
import Payout from "../../models/payoutModel.js";

export const getVendorsWithBalances = async (page = 1, limit = 10, search = "") => {
  const skip = (page - 1) * limit;

  // Find vendors
  const query = { role: "vendor" };
  if (search) {
    query.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { storeName: { $regex: search, $options: "i" } }
    ];
  }

  const vendors = await Admin.find(query).skip(skip).limit(limit).lean();
  const total = await Admin.countDocuments(query);

  const vendorData = await Promise.all(
    vendors.map(async (vendor) => {
      // Aggregate earnings from delivered orderedItems
      const orders = await Order.find({
        "orderedItems.adminId": vendor._id,
        "orderedItems.status": "Delivered",
      });

      let totalEarned = 0;
      let totalCommission = 0;

      orders.forEach((order) => {
        order.orderedItems.forEach((item) => {
          if (item.adminId.toString() === vendor._id.toString() && item.status === "Delivered") {
            // Fallback if vendorEarning/commissionAmount are missing
            const price = item.price * item.quantity;
            const earned = item.vendorEarning || (price * 0.9); 
            const commission = item.commissionAmount || (price * 0.1);
            
            totalEarned += earned;
            totalCommission += commission;
          }
        });
      });

      // Aggregate payouts
      const payouts = await Payout.find({ adminId: vendor._id, status: "completed" });
      const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

      const pendingBalance = totalEarned - totalPaid;

      return {
        _id: vendor._id,
        fullname: vendor.fullname,
        email: vendor.email,
        storeName: vendor.storeName,
        phone: vendor.phone,
        totalEarned,
        totalCommission,
        totalPaid,
        pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
      };
    })
  );

  return {
    vendors: vendorData,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
};

export const recordPayout = async (adminId, amount, referenceId, notes) => {
  const payout = new Payout({
    adminId,
    amount,
    referenceId,
    notes,
    status: "completed"
  });
  await payout.save();
  return payout;
};

export const getPayoutHistory = async (adminId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const payouts = await Payout.find({ adminId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await Payout.countDocuments({ adminId });
  
  return {
    payouts,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
};
