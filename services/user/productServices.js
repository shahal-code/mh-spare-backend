import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Admin from "../../models/adminModel.js";
import { getCache, setCache } from "../../utils/cacheHelper.js";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheKeys.js";

async function applyOffers(products) {
    if (!products) return products;
    const isArray = Array.isArray(products);
    const productsList = isArray ? products : [products];
    if (productsList.length === 0) return products;

    const currentDate = new Date();
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeOffers = await Offer.find({
        isActive: true,
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
        offerType: { $in: ["product", "category"] }
    }).lean();

    if (activeOffers.length === 0) return products;

    productsList.forEach(product => {
        let bestOffer = null;
        let maxDiscountAmountForComparison = 0;

        activeOffers.forEach(offer => {
            let isApplicable = false;
            
            // Check product offer
            if (offer.offerType === 'product' && offer.applicableTo && offer.applicableTo.toString() === product._id.toString()) {
                isApplicable = true;
            } 
            // Check category offer
            else if (offer.offerType === 'category' && offer.applicableTo && product.category_id) {
                const catId = product.category_id._id ? product.category_id._id.toString() : product.category_id.toString();
                if (offer.applicableTo.toString() === catId) {
                    isApplicable = true;
                }
            }

            if (isApplicable) {
                let currentDiscount = 0;
                const basePrice = product.variants[0]?.price || 0;
                if (offer.discountType === 'percentage') {
                    currentDiscount = (basePrice * offer.discountValue) / 100;
                    if (offer.maxDiscountAmount && currentDiscount > offer.maxDiscountAmount) {
                        currentDiscount = offer.maxDiscountAmount;
                    }
                } else {
                    currentDiscount = offer.discountValue;
                }

                if (currentDiscount > maxDiscountAmountForComparison) {
                    maxDiscountAmountForComparison = currentDiscount;
                    bestOffer = offer;
                }
            }
        });

        if (bestOffer) {
            product.offer = bestOffer;
            product.variants.forEach(variant => {
                variant.originalPrice = variant.price;
                let discountAmount = 0;
                if (bestOffer.discountType === 'percentage') {
                    discountAmount = (variant.price * bestOffer.discountValue) / 100;
                    if (bestOffer.maxDiscountAmount && discountAmount > bestOffer.maxDiscountAmount) {
                        discountAmount = bestOffer.maxDiscountAmount;
                    }
                } else if (bestOffer.discountType === 'flat') {
                    discountAmount = bestOffer.discountValue;
                }
                variant.price = Math.max(0, variant.price - discountAmount);
            });
        }
    });

    return isArray ? productsList : productsList[0];
}



async function getProductDetails(productId) {
    const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(productId);
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const product = await Product.findById(productId)
        .populate("category_id")
        .populate("adminId")
        .lean();

    if (!product) return null;

    if (product.is_blocked || product.is_unlisted || product.approvalStatus !== 'approved' || (product.category_id && product.category_id.is_blocked) || (product.adminId && product.adminId.status === 'blocked')) {
        product.isUnavailable = true;
    }

    const activeAdmins = await Admin.find({ status: { $ne: 'blocked' } }).select('_id');
    const activeAdminIds = activeAdmins.map(a => a._id);

    // Fetch related products (same category and not blocked)
    const relatedProducts = product.isUnavailable ? [] : await Product.find({
        category_id: product.category_id?._id || product.category_id,
        _id: { $ne: product._id },
        adminId: { $in: activeAdminIds },
        is_blocked: { $ne: true },
        is_unlisted: { $ne: true },
        approvalStatus: 'approved'
    })
        .populate("category_id")
        .limit(4)
        .lean();

    // Filter related products for blocked categories
    const filteredRelated = relatedProducts.filter(p => p.category_id && !p.category_id.is_blocked);

    await applyOffers(product);
    await applyOffers(filteredRelated);

    const result = { product, relatedProducts: filteredRelated };
    await setCache(cacheKey, result, CACHE_TTL.PRODUCT_DETAIL);
    return result;
}

const getShopData = async (queryParams) => {
    const queryString = new URLSearchParams(queryParams).toString();
    const cacheKey = CACHE_KEYS.SHOP_PRODUCTS(queryString);
    const cached = await getCache(cacheKey);
    if (cached) return cached;
    const { search, category, sort, page = 1, limit = 5 } = queryParams;

    // Fetch active categories for filter options. If the category list is empty,
    // do not let it wipe out every product from the shop catalogue.
    const activeCategories = await Category.find({ is_blocked: false }).select('_id name');
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    const activeAdmins = await Admin.find({ status: { $ne: 'blocked' } }).select('_id');
    const activeAdminIds = activeAdmins.map(a => a._id);

    // 1. Build the Query Object
    let query = {
        is_blocked: { $ne: true },
        is_unlisted: { $ne: true },
        approvalStatus: 'approved',
        adminId: { $in: activeAdminIds }
    };

    if (activeCategoryIds.length > 0) {
        query.category_id = { $in: activeCategoryIds };
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "specifications.partNumber": { $regex: search, $options: "i" } },
            { "specifications.compatibility": { $regex: search, $options: "i" } },
            { "specifications.brand": { $regex: search, $options: "i" } }
        ];
    }

    if (category) {
        // If active categories exist, keep blocked categories out of the public shop.
        if (activeCategoryIds.length === 0 || activeCategoryIds.some(id => id.toString() === category)) {
            query.category_id = category;
        } else {
            return {
                products: [],
                categories: activeCategories,
                totalProducts: 0,
                currentPage: parseInt(page),
                totalPages: 0
            };
        }
    }

    if (queryParams.processor) {
        const processors = Array.isArray(queryParams.processor)
            ? queryParams.processor
            : [queryParams.processor];
        const processorRegexes = processors.map(p => new RegExp(p, 'i'));
        query["$or"] = [
            { "variants.processor": { $in: processorRegexes } },
            { "variants.processorBrand": { $in: processorRegexes } }
        ];
    }

    if (queryParams.ram) {
        if (Array.isArray(queryParams.ram)) {
            query["variants.ram"] = { $in: queryParams.ram };
        } else {
            query["variants.ram"] = queryParams.ram;
        }
    }

    if (queryParams.gpu) {
        if (Array.isArray(queryParams.gpu)) {
            query["variants.gpu"] = { $in: queryParams.gpu };
        } else {
            query["variants.gpu"] = queryParams.gpu;
        }
    }

    if (queryParams.storage) {
        if (Array.isArray(queryParams.storage)) {
            query["variants.storage"] = { $in: queryParams.storage };
        } else {
            query["variants.storage"] = queryParams.storage;
        }
    }

    if (queryParams.size) {
        if (Array.isArray(queryParams.size)) {
            query["variants.size"] = { $in: queryParams.size };
        } else {
            query["variants.size"] = queryParams.size;
        }
    }

    let sortOrder = {};
    if (sort === "priceLow") {
        sortOrder = { "variants.price": 1 };
    } else if (sort === "priceHigh") {
        sortOrder = { "variants.price": -1 };
    } else if (sort === "aa") {
        sortOrder = { name: 1 };
    } else if (sort === "zz") {
        sortOrder = { name: -1 };
    } else {
        sortOrder = { createdAt: -1 };
    }

    // 2. Build the Price Filter
    if (queryParams.price) {
        if (queryParams.price === "under50000") {
            query["variants.price"] = { $lt: 50000 };
        } else if (queryParams.price === "50000-100000") {
            query["variants.price"] = { $gte: 50000, $lte: 100000 };
        } else if (queryParams.price === "100000-200000") {
            query["variants.price"] = { $gte: 100000, $lte: 200000 };
        } else if (queryParams.price === "over200000") {
            query["variants.price"] = { $gt: 200000 };
        }
    } else if (queryParams.minPrice || queryParams.maxPrice) {
        query["variants.price"] = {};
        const min = parseInt(queryParams.minPrice);
        const max = parseInt(queryParams.maxPrice);
        if (!isNaN(min)) query["variants.price"].$gte = min;
        if (!isNaN(max)) query["variants.price"].$lte = max;
        // If empty object, delete it
        if (Object.keys(query["variants.price"]).length === 0) {
            delete query["variants.price"];
        }
    }

    // 3. Fetch Data with Pagination
    const skip = (page - 1) * limit;

    let products = await Product.find(query)
        .populate("category_id")
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    products = await applyOffers(products);

    const totalProducts = await Product.countDocuments(query);

    const result = {
        products,
        categories: activeCategories,
        totalProducts,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / limit)
    };

    await setCache(cacheKey, result, CACHE_TTL.SHOP_PRODUCTS);
    return result;
};

async function getFeaturedProducts(limit = 3) {
    const cacheKey = CACHE_KEYS.LANDING_PRODUCTS;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const activeCategories = await Category.find({ is_blocked: false }).select('_id name');
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    const activeAdmins = await Admin.find({ status: { $ne: 'blocked' } }).select('_id');
    const activeAdminIds = activeAdmins.map(a => a._id);

    const query = {
        is_blocked: { $ne: true },
        is_unlisted: { $ne: true },
        approvalStatus: 'approved',
        adminId: { $in: activeAdminIds }
    };

    if (activeCategoryIds.length > 0) {
        query.category_id = { $in: activeCategoryIds };
    }

    const products = await Product.find(query)
        .populate("category_id")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const result = await applyOffers(products);
    await setCache(cacheKey, result, CACHE_TTL.LANDING_PRODUCTS);
    return result;
}

async function checkProductAvailability(productId) {
    return await Product.findById(productId).populate('category_id').lean();
}

export {
    getShopData,
    getProductDetails,
    getFeaturedProducts,
    checkProductAvailability,
    applyOffers
};
