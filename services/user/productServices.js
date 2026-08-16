import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Offer from "../../models/offerModel.js";
import Admin from "../../models/adminModel.js";
import { getCache, setCache } from "../../utils/cacheHelper.js";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheKeys.js";

async function getActiveAdminIds() {
    const cacheKey = CACHE_KEYS.ADMINS_ACTIVE;
    let activeAdminIds = await getCache(cacheKey);
    if (!activeAdminIds) {
        const activeAdmins = await Admin.find({ status: { $ne: 'blocked' } }).select('_id');
        activeAdminIds = activeAdmins.map(a => a._id.toString());
        await setCache(cacheKey, activeAdminIds, 300); // 5 min
    }
    return activeAdminIds;
}

async function applyOffers(products) {
    if (!products) return products;
    const isArray = Array.isArray(products);
    const productsList = isArray ? products : [products];
    if (productsList.length === 0) return products;

    // Cache the active offers list for 5 minutes — avoids a Mongo hit on every
    // shop page load and every product detail request.
    const cacheKey = CACHE_KEYS.OFFERS_ACTIVE_LIST;
    let activeOffers = await getCache(cacheKey);
    if (!activeOffers) {
        const currentDate = new Date();
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
            offerType: { $in: ["product", "category"] }
        }).lean();

        await setCache(cacheKey, activeOffers, 300); // 5 min
    }

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

    const activeAdminIds = await getActiveAdminIds();

    let filteredRelated = [];

    if (!product.isUnavailable) {
        const catId = product.category_id?._id || product.category_id;
        const catSearch = catId ? [catId, catId.toString()].filter(Boolean) : [];

        const baseFilter = {
            _id: { $ne: product._id },
            adminId: { $in: activeAdminIds },
            is_blocked: { $ne: true },
            is_unlisted: { $ne: true },
            $or: [
                { approvalStatus: 'approved' },
                { approvalStatus: { $exists: false } }
            ]
        };

        // Priority 1: Same category
        const sameCategoryProducts = await Product.find({
            ...baseFilter,
            category_id: { $in: catSearch }
        })
            .populate("category_id")
            .limit(8)
            .lean();

        filteredRelated = sameCategoryProducts.filter(p => p.category_id && !p.category_id.is_blocked);

        // Priority 2: Fill remaining slots with same-brand products if under 8
        if (filteredRelated.length < 8 && product.specifications?.brand) {
            const existingIds = filteredRelated.map(p => p._id.toString());
            const brandProducts = await Product.find({
                ...baseFilter,
                _id: { $ne: product._id, $nin: existingIds },
                'specifications.brand': product.specifications.brand
            })
                .populate("category_id")
                .limit(8 - filteredRelated.length)
                .lean();

            const filteredBrand = brandProducts.filter(p => p.category_id && !p.category_id.is_blocked);
            filteredRelated = [...filteredRelated, ...filteredBrand];
        }
    }

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

    const activeAdminIds = await getActiveAdminIds();

    // 1. Build the Query Conditions ($and array)
    const andConditions = [
        { is_blocked: { $ne: true } },
        { is_unlisted: { $ne: true } },
        {
            $or: [
                { adminId: { $in: activeAdminIds } },
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        },
        {
            $or: [
                { approvalStatus: 'approved' },
                { approvalStatus: { $exists: false } }
            ]
        }
    ];

    if (activeCategoryIds.length > 0) {
        andConditions.push({
            $or: [
                { category_id: { $in: activeCategoryIds } },
                { category_id: { $exists: false } },
                { category_id: null }
            ]
        });
    }

    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        andConditions.push({
            $or: [
                { name: searchRegex },
                { description: searchRegex },
                { "specifications.partNumber": searchRegex },
                { "specifications.compatibility": searchRegex },
                { "specifications.brand": searchRegex }
            ]
        });
    }

    if (category) {
        // If active categories exist, keep blocked categories out of the public shop.
        if (activeCategoryIds.length === 0 || activeCategoryIds.some(id => id.toString() === category)) {
            andConditions.push({ category_id: category });
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
        const processorRegexes = processors.map(p => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        andConditions.push({
            $or: [
                { "variants.processor": { $in: processorRegexes } },
                { "variants.processorBrand": { $in: processorRegexes } }
            ]
        });
    }

    if (queryParams.ram) {
        const val = Array.isArray(queryParams.ram) ? { $in: queryParams.ram } : queryParams.ram;
        andConditions.push({ "variants.ram": val });
    }

    if (queryParams.gpu) {
        const val = Array.isArray(queryParams.gpu) ? { $in: queryParams.gpu } : queryParams.gpu;
        andConditions.push({ "variants.gpu": val });
    }

    if (queryParams.storage) {
        const val = Array.isArray(queryParams.storage) ? { $in: queryParams.storage } : queryParams.storage;
        andConditions.push({ "variants.storage": val });
    }

    if (queryParams.size) {
        const val = Array.isArray(queryParams.size) ? { $in: queryParams.size } : queryParams.size;
        andConditions.push({ "variants.size": val });
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
        let pFilter = null;
        if (queryParams.price === "under50000") pFilter = { $lt: 50000 };
        else if (queryParams.price === "50000-100000") pFilter = { $gte: 50000, $lte: 100000 };
        else if (queryParams.price === "100000-200000") pFilter = { $gte: 100000, $lte: 200000 };
        else if (queryParams.price === "over200000") pFilter = { $gt: 200000 };

        if (pFilter) {
            andConditions.push({
                $or: [{ price: pFilter }, { "variants.price": pFilter }]
            });
        }
    } else if (queryParams.minPrice || queryParams.maxPrice) {
        const priceFilter = {};
        const min = parseInt(queryParams.minPrice);
        const max = parseInt(queryParams.maxPrice);
        if (!isNaN(min)) priceFilter.$gte = min;
        if (!isNaN(max)) priceFilter.$lte = max;
        if (Object.keys(priceFilter).length > 0) {
            andConditions.push({
                $or: [{ price: priceFilter }, { "variants.price": priceFilter }]
            });
        }
    }

    const query = { $and: andConditions };

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
    const activeCategories = await Category.find({ is_blocked: false }).select('_id name');
    const activeCategoryIds = activeCategories.map(cat => cat._id);

    const activeAdminIds = await getActiveAdminIds();

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

    return await applyOffers(products);
}

async function checkProductAvailability(productId) {
    return await Product.findById(productId).populate('category_id').populate('adminId').lean();
}

export {
    getShopData,
    getProductDetails,
    getFeaturedProducts,
    checkProductAvailability,
    applyOffers
};
