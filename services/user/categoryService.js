import Category from "../../models/categoryModel.js";

/**
 * Get active categories for user display.
 * @param {number} limit 
 */
export const getActiveCategories = async (limit = 100) => {
    return await Category.find({ is_blocked: false }).limit(limit).lean();
};

/**
 * Get all active categories with essential fields only.
 */
export const getAllActiveCategories = async () => {
    return await Category.find({ is_blocked: false }).select('_id name').lean();
};
