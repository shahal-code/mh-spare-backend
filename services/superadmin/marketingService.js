import Coupon from "../../models/couponModel.js";
import Offer from "../../models/offerModel.js";
import Banner from "../../models/bannerModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

export const getCoupons = async () => {
  return await Coupon.find().sort({ createdAt: -1 }).lean();
};

export const getCouponById = async (id) => {
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) throw new Error("Coupon not found");
  return coupon;
};

export const createCoupon = async (data) => {
  const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = data;
  if (!code || !discountType || !discountValue || !expirationDate) {
    throw new Error("All required fields must be filled.");
  }
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) throw new Error("A coupon with this code already exists.");
  return await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxDiscountAmount: maxDiscountAmount || null,
    expirationDate: new Date(expirationDate),
    isActive: true,
  });
};

export const updateCoupon = async (id, data) => {
  const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = data;
  if (!code || !discountType || !discountValue || !expirationDate) {
    throw new Error("All required fields must be filled.");
  }
  const existing = await Coupon.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
  if (existing) throw new Error("Another coupon with this code already exists.");
  return await Coupon.findByIdAndUpdate(id, {
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxDiscountAmount: maxDiscountAmount || null,
    expirationDate: new Date(expirationDate),
  }, { new: true });
};

export const toggleCoupon = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new Error("Coupon not found.");
  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new Error("Coupon not found.");
  return coupon;
};

export const getOfferMeta = async () => {
  const products = await Product.find({ is_unlisted: false, is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
  const categories = await Category.find({ is_blocked: false }).select("name _id").sort({ name: 1 }).lean();
  return { products, categories };
};

export const getOffers = async () => {
  return await Offer.find({ offerType: { $in: ADMIN_OFFER_TYPES } }).sort({ createdAt: -1 }).lean();
};

export const getOfferById = async (id) => {
  const offer = await Offer.findById(id).lean();
  if (!offer) throw new Error("Offer not found");
  return offer;
};

export const createOffer = async (data, file) => {
  const { title, description, discountType, discountValue, offerType, targetIds, startDate, endDate } = data;
  if (!title || !discountType || !discountValue || !offerType || !startDate || !endDate) {
    throw new Error("All required fields must be filled.");
  }
  if (!ADMIN_OFFER_TYPES.includes(offerType)) {
    throw new Error("Super Admin can only create Product or Category offers.");
  }
  
  let parsedTargetIds = [];
  if (targetIds) {
    try {
      parsedTargetIds = typeof targetIds === "string" ? JSON.parse(targetIds) : targetIds;
    } catch (e) {
      parsedTargetIds = [targetIds];
    }
  }

  const existing = await Offer.findOne({ title: { $regex: new RegExp(`^${title}$`, "i") } });
  if (existing) throw new Error("An offer with this title already exists.");

  return await Offer.create({
    title,
    description: description || "",
    discountType,
    discountValue: Number(discountValue),
    offerType,
    targetIds: parsedTargetIds,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    image: file ? `/uploads/offers/${file.filename}` : "",
    isActive: true,
  });
};

export const updateOffer = async (id, data, file) => {
  const { title, description, discountType, discountValue, offerType, targetIds, startDate, endDate } = data;
  if (!title || !discountType || !discountValue || !offerType || !startDate || !endDate) {
    throw new Error("All required fields must be filled.");
  }

  let parsedTargetIds = [];
  if (targetIds) {
    try {
      parsedTargetIds = typeof targetIds === "string" ? JSON.parse(targetIds) : targetIds;
    } catch (e) {
      parsedTargetIds = [targetIds];
    }
  }

  const existing = await Offer.findOne({ title: { $regex: new RegExp(`^${title}$`, "i") }, _id: { $ne: id } });
  if (existing) throw new Error("Another offer with this title already exists.");

  const offer = await Offer.findById(id);
  if (!offer) throw new Error("Offer not found.");

  offer.title = title;
  offer.description = description || "";
  offer.discountType = discountType;
  offer.discountValue = Number(discountValue);
  offer.offerType = offerType;
  offer.targetIds = parsedTargetIds;
  offer.startDate = new Date(startDate);
  offer.endDate = new Date(endDate);
  
  if (file) {
    offer.image = `/uploads/offers/${file.filename}`;
  }

  return await offer.save();
};

export const toggleOffer = async (id) => {
  const offer = await Offer.findById(id);
  if (!offer) throw new Error("Offer not found.");
  offer.isActive = !offer.isActive;
  return await offer.save();
};

export const deleteOffer = async (id) => {
  const offer = await Offer.findByIdAndDelete(id);
  if (!offer) throw new Error("Offer not found.");
  return offer;
};

export const getBanners = async () => {
  return await Banner.find().sort({ createdAt: -1 }).lean();
};

export const createBanner = async (data, file) => {
  const { title, tagline, headline, subtitle, order } = data;
  if (!title || !file) {
    throw new Error("Title and image are required.");
  }
  return await Banner.create({
    title: title || "",
    tagline: tagline || "",
    headline: headline || "",
    subtitle: subtitle || "",
    image: file.location || `/uploads/banners/${file.filename}`,
    order: Number(order) || 0,
    isActive: true,
  });
};

export const updateBanner = async (id, data, file) => {
  const { title, tagline, headline, subtitle, order, isActive } = data;
  const banner = await Banner.findById(id);
  if (!banner) throw new Error("Banner not found.");
  
  if (title !== undefined) banner.title = title;
  if (tagline !== undefined) banner.tagline = tagline;
  if (headline !== undefined) banner.headline = headline;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (order !== undefined) banner.order = Number(order) || 0;
  if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
  if (file) {
    banner.image = file.location || `/uploads/banners/${file.filename}`;
  }
  return await banner.save();
};

export const deleteBanner = async (id) => {
  const banner = await Banner.findByIdAndDelete(id);
  if (!banner) throw new Error("Banner not found.");
  return banner;
};

export const getBrands = async () => {
  return await Brand.find().sort({ createdAt: -1 });
};

export const createBrand = async (data, file) => {
  const { name } = data;
  if (!name) throw new Error("Brand name is required");
  const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) throw new Error("Brand already exists");

  const imageUrl = file ? (file.location || file.path || `/uploads/brands/${file.filename}`) : (data.image || null);
  if (!imageUrl) throw new Error("Brand image is required");

  const newBrand = new Brand({
    name: name.trim(),
    image: imageUrl
  });
  const result = await newBrand.save();
  await deleteCache(CACHE_KEYS.BRANDS_ALL);
  return result;
};

export const deleteBrand = async (id) => {
  const brand = await Brand.findByIdAndDelete(id);
  if (!brand) throw new Error("Brand not found");
  return brand;
};
