import * as MarketingService from "../../services/vendoradmin/marketingService.js";

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const coupons = async (req, res) => {
  try {
    const vendorId = req.admin?._id || req.user?._id || null;
    const coupons = await MarketingService.getCoupons(vendorId);
    res.json({ coupons });
  } catch (error) {
    sendError(res, error);
  }
};

export const coupon = async (req, res) => {
  try {
    const vendorId = req.admin?._id || req.user?._id || null;
    const coupon = await MarketingService.getCouponById(req.params.id, vendorId);
    res.json({ coupon });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 403);
  }
};

export const createCoupon = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id || null;
    const coupon = await MarketingService.createCoupon(req.body, adminId, 'vendor');
    res.status(201).json({ success: true, coupon, message: "Coupon created successfully!" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const vendorId = req.admin?._id || req.user?._id || null;
    const coupon = await MarketingService.updateCoupon(req.params.id, req.body, vendorId);
    res.json({ success: true, coupon, message: "Coupon updated successfully!" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const toggleCoupon = async (req, res) => {
  try {
    const vendorId = req.admin?._id || req.user?._id || null;
    const coupon = await MarketingService.toggleCoupon(req.params.id, vendorId);
    res.json({ success: true, coupon });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const vendorId = req.admin?._id || req.user?._id || null;
    await MarketingService.deleteCoupon(req.params.id, vendorId);
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const offerMeta = async (req, res) => {
  try {
    const data = await MarketingService.getOfferMeta();
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const offers = async (req, res) => {
  try {
    const offers = await MarketingService.getOffers();
    res.json({ offers });
  } catch (error) {
    sendError(res, error);
  }
};

export const offer = async (req, res) => {
  try {
    const offer = await MarketingService.getOfferById(req.params.id);
    res.json({ offer });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const createOffer = async (req, res) => {
  try {
    const offer = await MarketingService.createOffer(req.body, req.file);
    res.status(201).json({ success: true, offer, message: "Offer created successfully!" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await MarketingService.updateOffer(req.params.id, req.body, req.file);
    res.json({ success: true, offer, message: "Offer updated successfully!" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const toggleOffer = async (req, res) => {
  try {
    const offer = await MarketingService.toggleOffer(req.params.id);
    res.json({ success: true, offer });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await MarketingService.deleteOffer(req.params.id);
    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const banners = async (req, res) => {
  try {
    const banners = await MarketingService.getBanners();
    res.json({ success: true, banners });
  } catch (error) {
    sendError(res, error);
  }
};

export const createBanner = async (req, res) => {
  try {
    const banner = await MarketingService.createBanner(req.body, req.file);
    res.status(201).json({ success: true, banner });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateBanner = async (req, res) => {
  try {
    const banner = await MarketingService.updateBanner(req.params.id, req.body, req.file);
    res.json({ success: true, banner });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const deleteBanner = async (req, res) => {
  try {
    await MarketingService.deleteBanner(req.params.id);
    res.json({ success: true, message: "Banner deleted" });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};

export const brands = async (req, res) => {
  try {
    const brands = await MarketingService.getBrands();
    res.json({ success: true, brands });
  } catch (error) {
    sendError(res, error);
  }
};

export const createBrand = async (req, res) => {
  try {
    const brand = await MarketingService.createBrand(req.body, req.file);
    res.status(201).json({ success: true, brand, message: "Brand created successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const deleteBrand = async (req, res) => {
  try {
    await MarketingService.deleteBrand(req.params.id);
    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    sendError(res, error, error.message.includes("not found") ? 404 : 500);
  }
};
