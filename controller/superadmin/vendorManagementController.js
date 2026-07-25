import { validateLogin } from "../../utils/validation.js";
import { addClient, removeClient } from "../../utils/sseManager.js";
import * as VendorManagementService from "../../services/superadmin/vendorManagementService.js";

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const createVendor = async (req, res) => {
  try {
    const vendorData = await VendorManagementService.createVendor(req.body);
    res.status(201).json({
      success: true,
      vendor: vendorData,
      credentials: { email: req.body.email, password: req.body.password },
      message: "Vendor account created successfully.",
    });
  } catch (error) {
    sendError(res, error, error.message.includes("required") || error.message.includes("registered") ? 400 : 500);
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await VendorManagementService.getVendors();
    res.json({ success: true, vendors });
  } catch (error) {
    sendError(res, error);
  }
};

export const bulkApproveVendors = async (req, res) => {
  try {
    await VendorManagementService.bulkApproveVendors(req.body.vendorIds);
    res.json({ success: true, message: "Vendors approved." });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkBlockVendors = async (req, res) => {
  try {
    await VendorManagementService.bulkBlockVendors(req.body.vendorIds);
    res.json({ success: true, message: "Vendors blocked." });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const bulkDeleteVendors = async (req, res) => {
  try {
    await VendorManagementService.bulkDeleteVendors(req.body.vendorIds);
    res.json({ success: true, message: "Vendors deleted." });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const approveVendor = async (req, res) => {
  try {
    const vendor = await VendorManagementService.approveVendor(req.params.id);
    res.json({ success: true, vendor });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const blockVendor = async (req, res) => {
  try {
    const vendor = await VendorManagementService.blockVendor(req.params.id);
    res.json({ success: true, vendor });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const deleteVendor = async (req, res) => {
  try {
    await VendorManagementService.deleteVendor(req.params.id);
    res.json({ success: true, message: 'Vendor and associated products deleted successfully' });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const updateVendorProfile = async (req, res) => {
  try {
    const vendor = await VendorManagementService.updateVendorProfile(req.params.id, req.body);
    res.json({ success: true, message: "Vendor profile updated successfully.", vendor });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const updateKycStatus = async (req, res) => {
  try {
    const vendor = await VendorManagementService.updateKycStatus(req.params.id, req.body.kycStatus);
    res.json({ success: true, message: "KYC Status updated successfully.", vendor });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const resetVendorPassword = async (req, res) => {
  try {
    const vendor = await VendorManagementService.resetVendorPassword(req.params.id, req.body.password);
    res.json({
      success: true,
      credentials: { email: vendor.email, password: req.body.password },
      message: "Vendor password changed successfully.",
    });
  } catch (error) {
    sendError(res, error, error.message.includes("required") || error.message.includes("characters") ? 400 : 500);
  }
};

export const updateVendorPhone = async (req, res) => {
  try {
    const vendor = await VendorManagementService.updateVendorPhone(req.params.id, req.body.phone);
    res.json({ success: true, message: "Vendor phone updated successfully.", vendor });
  } catch (error) {
    sendError(res, error, error.message.includes("Invalid") ? 400 : 500);
  }
};

export const vendorStats = async (req, res) => {
  try {
    const data = await VendorManagementService.vendorStats(req.params.id);
    res.json({ success: true, ...data });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const vendorProducts = async (req, res) => {
  try {
    const products = await VendorManagementService.vendorProducts(req.params.id, req.query);
    res.json({ success: true, products });
  } catch (error) {
    sendError(res, error);
  }
};

export const clearVendorActivities = async (req, res) => {
  try {
    await VendorManagementService.clearVendorActivities(req.params.id);
    res.json({ success: true, message: 'Activity log cleared' });
  } catch (error) {
    sendError(res, error);
  }
};