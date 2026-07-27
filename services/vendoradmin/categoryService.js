import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js";

// Get all categories with pagination and product counts.
export const getCategoryOptions = async () => {
    return await Category.find({ is_blocked: false }).sort({ name: 1 }).lean();
};

export const getAllCategories = async (query, page, limit) => {
    const categories = await Category.find(query)
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
    const activeCategories = await Category.countDocuments({ is_blocked: false });
    const blockedCategories = await Category.countDocuments({ is_blocked: true });

    return {
        total: totalCount,
        addedQuarter: 0,
        newestName: newestCategory ? newestCategory.name : "N/A",
        newestDate: newestCategory ? newestCategory.created_at : null,
        activeCategories,
        blockedCategories
    };
};

// Get category by ID.
export const getCategoryById = async (id) => {
    return await Category.findById(id);
};

// Create a new category.
export const createCategory = async (categoryData) => {
    const { name, description, image, url_slug } = categoryData;
    
    if (!name || name.trim() === "") {
        throw new Error("Category name is required");
    }

    const categoryExists = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (categoryExists) {
        throw new Error("Category already exists");
    }

    const newCategory = new Category({
        name,
        description,
        image,
        url_slug
    });

    return await newCategory.save();
};

// Update an existing category.
export const updateCategory = async (id, updateData) => {
    const { name, description, image, url_slug } = updateData;

    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
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

    return await category.save();
};

// Toggle category block status.
export const toggleCategoryStatus = async (id) => {
    const category = await Category.findById(id);
    if (!category) {
        throw new Error("Category not found");
    }
    
    category.is_blocked = !category.is_blocked;
    return await category.save();
};

// Delete a category.
export const deleteCategory = async (id) => {
    const productsUsingCategory = await Product.findOne({ category_id: id });
    if (productsUsingCategory) {
        throw new Error("Cannot delete category. It is being used by one or more products.");
    }
    
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
        throw new Error("Category not found");
    }
    
    return category;
};
