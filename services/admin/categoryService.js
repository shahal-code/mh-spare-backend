import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js";


 // Get all categories with pagination and product counts.
 
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


//  Get category summary stats.

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
    const { name, description, image } = categoryData;

    // Check if category already exists
    const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
        throw new Error("Category already exists");
    }

    const newCategory = new Category({
        name,
        description,
        url_slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        image: image || "",
        is_blocked: false
    });

    return await newCategory.save();
};


 // Update an existing category.

export const updateCategory = async (id, categoryData) => {
    const { name, description, image } = categoryData;

    const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
    });

    if (existingCategory) {
        throw new Error("Category name already exists");
    }

    const update = {
        name,
        description,
        url_slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    };
    if (image) update.image = image;

    const updatedCategory = await Category.findByIdAndUpdate(
        id,
        update,
        { returnDocument: 'after' }
    );

    if (!updatedCategory) {
        throw new Error("Category not found");
    }

    return updatedCategory;
};


 // Toggle category blocked status.
 
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
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
        throw new Error("Category not found");
    }
    return deletedCategory;
};






