import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js";
import { deleteCache, deleteCachePattern } from "../../utils/cacheHelper.js";
import { CACHE_KEYS } from "../../utils/cacheKeys.js";

// Invalidate all category-related caches (also products since they depend on categories)
const invalidateCategoryCache = async () => {
    await deleteCache(CACHE_KEYS.CATEGORIES_ACTIVE);
    await deleteCache(CACHE_KEYS.CATEGORIES_ACTIVE_ALL);
    await deleteCache(CACHE_KEYS.LANDING_PRODUCTS);
    await deleteCachePattern("shop:*");
};

// Get all categories with pagination and product counts.
export const getCategoryOptions = async () => {
    return await Category.find({ 
        is_blocked: false, 
        $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] 
    }).sort({ name: 1 }).lean();
};

export const getAllCategories = async (query, page, limit) => {
    const categories = await Category.find(query)
        .populate("createdBy", "fullname email role")
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    // Attach product count to each category
    const categoriesWithCounts = await Promise.all(
        categories.map(async (cat) => {
            const productCount = await Product.countDocuments({ category_id: cat._id });
            return { ...cat, productCount };
        })
    );

    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);

    return {
        categories: categoriesWithCounts,
        totalCategories,
        totalPages
    };
};

// Get category summary stats.
export const getCategoryStats = async () => {
    const totalCount = await Category.countDocuments();
    const newestCategory = await Category.findOne().sort({ created_at: -1 });
    const activeCategories = await Category.countDocuments({ is_blocked: false, $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] });
    const blockedCategories = await Category.countDocuments({ is_blocked: true });
    const pendingCategories = await Category.countDocuments({ approvalStatus: 'pending' });

    return {
        total: totalCount,
        addedQuarter: 0,
        newestName: newestCategory ? newestCategory.name : "N/A",
        newestDate: newestCategory ? newestCategory.created_at : null,
        activeCategories,
        blockedCategories,
        pendingCategories
    };
};

// Get category by ID.
export const getCategoryById = async (id) => {
    return await Category.findById(id).populate("createdBy", "fullname email role");
};

// Create a new category.
export const createCategory = async (categoryData, adminUser = null) => {
    const { name, description, image, url_slug } = categoryData;
    
    if (!name || name.trim() === "") {
        throw new Error("Category name is required");
    }

    const categoryExists = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (categoryExists) {
        throw new Error("Category already exists");
    }

    const isOwner = !adminUser || adminUser.role === 'owner';
    const approvalStatus = isOwner ? 'approved' : 'pending';

    const newCategory = new Category({
        name,
        description,
        image,
        url_slug,
        createdBy: adminUser?._id || categoryData.createdBy || null,
        approvalStatus
    });

    const result = await newCategory.save();

    if (!isOwner) {
        try {
            const { notifySuperAdmins } = await import('../superadmin/notificationService.js');
            await notifySuperAdmins(
                'New Category Pending Approval',
                `Vendor "${adminUser?.fullname || 'Vendor'}" created category "${name}" pending approval.`,
                'category',
                `/superadmin/categories`
            );
        } catch (err) {
            console.error("Failed to notify superadmins for category:", err.message);
        }
    }

    await invalidateCategoryCache();
    return result;
};

// SuperAdmin approval / rejection of vendor created category
export const updateCategoryApproval = async (id, approvalStatus, adminUser = null) => {
    if (adminUser && adminUser.role !== 'owner') {
        throw new Error("Permission denied. Only Super Admin can approve or reject categories.");
    }

    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
    }

    category.approvalStatus = approvalStatus;
    if (approvalStatus === 'rejected') {
        category.is_blocked = true;
    } else if (approvalStatus === 'approved') {
        category.is_blocked = false;
    }

    const result = await category.save();
    await invalidateCategoryCache();
    return result;
};

// Update an existing category.
export const updateCategory = async (id, updateData, adminUser = null) => {
    const { name, description, image, url_slug } = updateData;

    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
    }

    // Permission check for vendors: Vendors cannot update categories created by others
    const isVendor = adminUser && adminUser.role !== 'owner';
    if (isVendor) {
        if (category.createdBy && category.createdBy.toString() !== adminUser._id.toString()) {
            throw new Error("Permission denied. You can only update categories created by your account.");
        }
    }

    if (name) {
        const categoryExists = await Category.findOne({ name: new RegExp(`^${name}$`, 'i'), _id: { $ne: id } });
        if (categoryExists) {
            throw new Error("Category name already exists");
        }
        category.name = name;
    }

    if (description) category.description = description;
    if (image) category.image = image;
    if (url_slug) category.url_slug = url_slug;

    // If edited by a vendor, reset approvalStatus to 'pending' and is_blocked to false
    if (isVendor) {
        category.approvalStatus = 'pending';
        category.is_blocked = false;
        
        try {
            const { notifySuperAdmins } = await import('../superadmin/notificationService.js');
            await notifySuperAdmins(
                'Category Re-Submitted For Approval',
                `Vendor "${adminUser?.fullname || 'Vendor'}" updated category "${category.name}" and re-submitted it for approval.`,
                'category',
                `/superadmin/categories`
            );
        } catch (err) {
            console.error("Failed to notify superadmins for category edit:", err.message);
        }
    }

    const result = await category.save();
    await invalidateCategoryCache();
    return result;
};

// Toggle category block status.
export const toggleCategoryStatus = async (id, adminUser = null) => {
    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
    }

    if (category.approvalStatus === 'rejected') {
        throw new Error("Cannot block or unblock a rejected category. Please edit the category to re-submit it for Super Admin approval.");
    }

    // Permission check for vendors
    if (adminUser && adminUser.role !== 'owner') {
        if (category.createdBy && category.createdBy.toString() !== adminUser._id.toString()) {
            throw new Error("Permission denied. You can only toggle categories created by your account.");
        }
    }
    
    category.is_blocked = !category.is_blocked;
    const result = await category.save();
    await invalidateCategoryCache();
    return result;
};

// Delete a category.
export const deleteCategory = async (id, adminUser = null) => {
    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
    }

    // Permission check for vendors: Vendors cannot delete categories created by others
    if (adminUser && adminUser.role !== 'owner') {
        if (category.createdBy && category.createdBy.toString() !== adminUser._id.toString()) {
            throw new Error("Permission denied. You can only delete categories created by your account.");
        }
    }

    // In-Use Category Protection: Cannot delete if linked to products
    const productCount = await Product.countDocuments({ category_id: id });
    if (productCount > 0) {
        throw new Error(`Cannot delete category "${category.name}". It is currently linked to ${productCount} active product(s). Please reassign or delete those products first.`);
    }
    
    await Category.findByIdAndDelete(id);
    await invalidateCategoryCache();
    return category;
};
