import * as CustomerService from "../../services/vendoradmin/customerService.js";

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const users = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const data = await CustomerService.getAllUsers(req.query, page, limit);
    const stats = await CustomerService.getCustomerStats();
    res.json({ ...data, page, limit, search, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const bulkToggleUsers = async (req, res) => {
  try {
    const result = await CustomerService.bulkToggleUsers(req.body);
    res.json(result);
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const userDetails = async (req, res) => {
  try {
    const data = await CustomerService.getUserDetails(req.params.id);
    res.json({ success: true, ...data });
  } catch (error) {
    sendError(res, error, error.message === "User not found" ? 404 : 500);
  }
};

export const toggleUser = async (req, res) => {
  try {
    const user = await CustomerService.toggleBlockStatus(req.params.id);
    res.json({ success: true, user });
  } catch (error) {
    sendError(res, error, error.message === "User not found" ? 404 : 500);
  }
};
