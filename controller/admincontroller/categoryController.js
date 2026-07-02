import Category from "../../models/categoryModel.js";
import * as CategoryService from "../../services/admin/categoryService.js";

// Load Category Page
export const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const search = req.query.search || "";

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const { categories, totalCategories, totalPages } = await CategoryService.getAllCategories(query, page, limit);
    const stats = await CategoryService.getCategoryStats();

    res.render("admin/category/category", {
      categories,
      page,
      totalPages,
      totalCategories,
      limit,
      search,
      activePage: "category",
      stats,
      activeCategories: stats.activeCategories,
      blockedCategories: stats.blockedCategories
    });

  } catch (error) {
    console.error("Error loading category page:", error);
    res.redirect("/admin/pageerror");
  }
};

// Get Add Category Page
export const getAddCategoryPage = async (req, res) => {
  try {
    res.render("admin/category/add-category", {
      activePage: "category"
    });
  } catch (error) {
    console.error("Error loading add category page:", error);
    res.redirect("/admin/pageerror");
  }
};

// Add New Category
export const addCategory = async (req, res) => {
  try {
    const { message } = await CategoryService.createCategory(req.body);
    res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(error.message === "Category already exists" ? 400 : 500).json({
      error: error.message || "Internal Server Error"
    });
  }
};

// Toggle Category Status (Block/Unblock)
export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CategoryService.toggleCategoryStatus(id);

    res.status(200).json({
      message: `Category ${category.is_blocked ? 'blocked' : 'unblocked'} successfully`,
      is_blocked: category.is_blocked
    });

  } catch (error) {
    console.error("Error toggling category status:", error);
    res.status(error.message === "Category not found" ? 404 : 500).json({
      error: error.message || "Internal Server Error"
    });
  }
};

// Get Edit Category Page
export const getEditCategoryPage = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CategoryService.getCategoryById(id);

    if (!category) {
      return res.redirect("/admin/category");
    }

    res.render("admin/category/edit-category", {
      category,
      activePage: "category"
    });
  } catch (error) {
    console.error("Error loading edit category page:", error);
    res.redirect("/admin/pageerror");
  }
};

// Edit Category
export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await CategoryService.updateCategory(id, req.body);
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error editing category:", error);
    const status = error.message === "Category not found" ? 404 : (error.message === "Category name already exists" ? 400 : 500);
    res.status(status).json({
      error: error.message || "Internal Server Error"
    });
  }
};

// Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await CategoryService.deleteCategory(id);
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(error.message === "Category not found" ? 404 : 500).json({
      error: error.message || "Internal Server Error"
    });
  }
};
