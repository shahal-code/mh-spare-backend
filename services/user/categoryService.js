import Category from "../../models/categoryModel.js";
import { getCache, setCache } from "../../utils/cacheHelper.js";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheKeys.js";

/**
 * Get active categories for user display.
 * @param {number} limit
 */
export const getActiveCategories = async (limit = 100) => {
    const cacheKey = CACHE_KEYS.CATEGORIES_ACTIVE;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const categories = await Category.find({ is_blocked: false }).limit(limit).lean();
    await setCache(cacheKey, categories, CACHE_TTL.CATEGORIES);
    return categories;
};

/**
 * Get all active categories with essential fields only.
 */
export const getAllActiveCategories = async () => {
    const cacheKey = CACHE_KEYS.CATEGORIES_ACTIVE_ALL;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const categories = await Category.find({ is_blocked: false }).select('_id name').lean();
    await setCache(cacheKey, categories, CACHE_TTL.CATEGORIES);
    return categories;
};
