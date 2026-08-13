import * as ProductService from "../services/user/productServices.js";
import * as CategoryService from "../services/user/categoryService.js";
import Review from "../models/reviewModel.js";
import Offer from "../models/offerModel.js";
import Banner from "../models/bannerModel.js";
import mongoose from "mongoose";
import { getCache, setCache } from "../utils/cacheHelper.js";
import { CACHE_KEYS, CACHE_TTL } from "../utils/cacheKeys.js";

const { Types } = mongoose;

const PLACEHOLDER_IMAGE = "/img/placeholder.jpg";

const toId = (value) => {
    if (!value) return null;
    if (value._id) return value._id.toString();
    return value.toString();
};

const normalizeCategory = (category) => {
    if (!category) return { id: "all", name: "All" };
    return {
        id: toId(category),
        name: category.name || "Uncategorized",
        icon: category.icon || "package",
        image: category.image || ""
    };
};

const pickVariant = (product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants.find(v => Number(v.stock || 0) > 0) || variants[0] || null;
};

const pickImage = (product, variant) => {
    if (variant?.images?.length) return variant.images[0];
    if (product.images?.length) return product.images[0];
    if (product.img) return product.img;
    if (product.thumbnail) return product.thumbnail;
    if (product.image) return product.image;
    return PLACEHOLDER_IMAGE;
};

const normalizeVariant = (variant) => ({
    id: toId(variant),
    _id: toId(variant),
    price: Number(variant?.price || 0),
    originalPrice: variant?.originalPrice ? Number(variant.originalPrice) : null,
    stock: Number(variant?.stock || 0),
    images: Array.isArray(variant?.images) ? variant.images : [],
    processor: variant?.processor || "",
    processorBrand: variant?.processorBrand || "",
    ram: variant?.ram || "",
    gpu: variant?.gpu || "",
    storage: variant?.storage || "",
    size: variant?.size || "",
    color: variant?.color || ""
});

const normalizeProduct = (product, ratingMap = {}) => {
    const variant = pickVariant(product);
    const variants = Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [];
    const category = normalizeCategory(product.category_id || product.category);
    const inStock = variants.length ? variants.some(v => v.stock > 0) : Boolean(product.inStock);
    const price = variant ? Number(variant.price || 0) : Number(product.price || 0);
    const originalPrice = variant?.originalPrice ? Number(variant.originalPrice) : (product.originalPrice || null);
    const productId = toId(product);
    const ratingData = ratingMap[productId] || {};

    const isUnavailable = Boolean(
        product.isUnavailable ||
        product.is_blocked === true ||
        product.is_unlisted === true ||
        (product.approvalStatus && product.approvalStatus !== 'approved') ||
        (product.category_id && product.category_id.is_blocked === true) ||
        (product.adminId && product.adminId.status === 'blocked')
    );

    const totalStock = typeof product.stock === 'number' 
        ? product.stock 
        : (variants.length ? variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 10);

    return {
        id: productId,
        _id: productId,
        name: product.name || "Unnamed product",
        description: product.description || "",
        img: pickImage(product, variant),
        image: pickImage(product, variant),
        images: product.images || [],
        thumbnail: product.thumbnail || "",
        highlights: Array.isArray(product.highlights) ? product.highlights : [],
        specifications: product.specifications || {},
        material: product.material || "",
        stock: totalStock,
        stockCount: totalStock,
        soldCount: product.soldCount || 0,
        inStock: isUnavailable ? false : (totalStock > 0 || inStock),
        price,
        originalPrice,
        variantId: toId(variant),
        category: category.id,
        categoryName: category.name,
        categoryData: category,
        variants,
        popular: isUnavailable ? false : inStock,
        createdAt: product.createdAt || null,
        offer: product.offer || null,
        averageRating: ratingData.avg || 0,
        totalRatings: ratingData.count || 0,
        isUnavailable,
        is_blocked: Boolean(product.is_blocked),
        is_unlisted: Boolean(product.is_unlisted),
        approvalStatus: product.approvalStatus || 'approved'
    };
};

// Batch fetch average ratings for a list of product ids
const batchGetRatings = async (productIds) => {
    if (!productIds || !productIds.length) return {};
    const objectIds = productIds
        .map(id => { try { return new Types.ObjectId(id); } catch { return null; } })
        .filter(Boolean);
    if (!objectIds.length) return {};
    const results = await Review.aggregate([
        { $match: { product: { $in: objectIds }, status: { $ne: "hidden" } } },
        { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const map = {};
    results.forEach(r => {
        map[r._id.toString()] = { avg: Math.round(r.avg * 10) / 10, count: r.count };
    });
    return map;
};

export const getLandingProducts = async (req, res) => {
    try {
        // Serve from cache — avoids heavy Review aggregate + Product queries on every homepage load
        const cacheKey = CACHE_KEYS.LANDING_PRODUCTS;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, ...cached, fromCache: true });
        }

        const featuredProducts = await ProductService.getFeaturedProducts(10);
        const productIds = featuredProducts.map(p => toId(p));
        const ratingMap = await batchGetRatings(productIds);
        const productsData = featuredProducts.map(p => normalizeProduct(p, ratingMap));

        const activeCategories = await CategoryService.getActiveCategories(10);
        const categoriesData = activeCategories.map(normalizeCategory);

        const payload = { products: productsData, categories: categoriesData };
        await setCache(cacheKey, payload, CACHE_TTL.LANDING_PRODUCTS);

        res.json({ success: true, ...payload });
    } catch (error) {
        console.error("API Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

export const getShopProducts = async (req, res) => {
    try {
        const data = await ProductService.getShopData(req.query);
        const products = data.products || [];
        const productIds = products.map(p => toId(p));
        const ratingMap = await batchGetRatings(productIds);
        
        res.json({
            success: true,
            products: products.map(p => normalizeProduct(p, ratingMap)),
            categories: (data.categories || []).map(normalizeCategory),
            totalProducts: data.totalProducts || 0,
            currentPage: data.currentPage || 1,
            totalPages: data.totalPages || 1
        });
    } catch (error) {
        console.error("API Error fetching shop products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch shop products" });
    }
};

const normalizeReview = (review) => ({
    id: toId(review),
    _id: toId(review),
    rating: Number(review.rating || 0),
    comment: review.comment || "",
    image: review.image || null,
    createdAt: review.createdAt || null,
    user: review.user ? {
        id: toId(review.user),
        _id: toId(review.user),
        fullname: review.user.fullname || "User",
        profileImage: review.user.profileImage || ""
    } : { fullname: "User", profileImage: "" }
});

const getReviewSummary = async (productId) => {
    // Cache per product — avoids repeated DB hits on every product page visit
    const cacheKey = CACHE_KEYS.PRODUCT_REVIEWS(productId);
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const reviews = await Review.find({ product: productId, status: { $ne: "hidden" } })
        .populate("user", "fullname profileImage")
        .sort({ createdAt: -1 })
        .lean();
    const averageRating = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length) * 10) / 10
        : 0;

    const result = {
        reviews: reviews.map(normalizeReview),
        averageRating,
        totalRatings: reviews.length
    };
    await setCache(cacheKey, result, CACHE_TTL.PRODUCT_REVIEWS);
    return result;
};

export const getProductDetails = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        const data = await ProductService.getProductDetails(req.params.id);
        if (!data?.product) {
            const productCheck = await ProductService.checkProductAvailability(req.params.id);
            if (productCheck) {
                return res.json({
                    success: true,
                    product: { ...normalizeProduct(productCheck), isUnavailable: true, unavailableMessage: "This product is currently unavailable." },
                    relatedProducts: [],
                    reviews: [],
                    averageRating: 0,
                    totalRatings: 0
                });
            }
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const reviewSummary = await getReviewSummary(req.params.id);
        res.json({
            success: true,
            product: normalizeProduct(data.product),
            relatedProducts: (data.relatedProducts || []).map(normalizeProduct),
            ...reviewSummary
        });
    } catch (error) {
        console.error("API Error fetching product details:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product details" });
    }
};

export const getActiveOffers = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.OFFERS_ACTIVE;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, offers: cached });
        }

        const currentDate = new Date();
        const offers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).sort({ endDate: 1 }).lean();
        
        // Find the full product for each offer so we can render DealsCarousel
        for (let offer of offers) {
            if (offer.applicableModel === "Product" && offer.applicableTo) {
                const productCheck = await ProductService.getProductDetails(offer.applicableTo);
                if (productCheck?.product) {
                    offer.productData = normalizeProduct(productCheck.product);
                }
            }
        }

        await setCache(cacheKey, offers, CACHE_TTL.OFFERS);
        res.json({ success: true, offers });
    } catch (error) {
        console.error("API Error fetching active offers:", error);
        res.status(500).json({ success: false, message: "Failed to fetch active offers" });
    }
};

export const getActiveBanners = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.BANNERS_ACTIVE;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, banners: cached });
        }

        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
        await setCache(cacheKey, banners, CACHE_TTL.BANNERS);
        res.json({ success: true, banners });
    } catch (error) {
        console.error("API Error fetching active banners:", error);
        res.status(500).json({ success: false, message: "Failed to fetch active banners" });
    }
};

export const getBrands = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.BRANDS_ALL;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, brands: cached });
        }

        const Brand = (await import('../models/brandModel.js')).default;
        const brands = await Brand.find().sort({ createdAt: -1 });
        await setCache(cacheKey, brands, CACHE_TTL.BRANDS);
        res.json({ success: true, brands });
    } catch (error) {
        console.error("API Error fetching brands:", error);
        res.status(500).json({ success: false, message: "Failed to fetch brands" });
    }
};
