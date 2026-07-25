import * as payoutService from "../../services/superadmin/payoutService.js";

export const getPayouts = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const data = await payoutService.getVendorsWithBalances(page, limit, search);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

export const createPayout = async (req, res, next) => {
  try {
    const { adminId, amount, referenceId, notes } = req.body;
    if (!adminId || !amount) {
      return res.status(400).json({ success: false, message: "Vendor ID and Amount are required." });
    }

    const payout = await payoutService.recordPayout(adminId, amount, referenceId, notes);
    res.status(201).json({ success: true, message: "Payout recorded successfully", payout });
  } catch (error) {
    next(error);
  }
};

export const getVendorHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;
    const data = await payoutService.getPayoutHistory(id, page, limit);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};
