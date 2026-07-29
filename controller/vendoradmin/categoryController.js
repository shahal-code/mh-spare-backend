import * as CategoryService from "../../services/vendoradmin/categoryService.js";

const sendError = (res, error, status = 500) => {
  const message = error?.message || "Internal Server Error";
  res.status(status).json({ success: false, message, error: message });
};

export const categoryOptions = async (req, res) => {
  try {
    const categories = await CategoryService.getCategoryOptions();
    res.json({ categories });
  } catch (error) {
    sendError(res, error);
  }
};

export const categories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const data = await CategoryService.getAllCategories(query, page, limit);
    const stats = await CategoryService.getCategoryStats();
    res.json({ ...data, page, limit, search, stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const category = async (req, res) => {
  try {
    const data = await CategoryService.getCategoryById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ category: data });
  } catch (error) {
    sendError(res, error);
  }
};

export const createCategory = async (req, res) => {
  try {
    const imagePath = req.file ? (req.file.location || req.(file.location || file.path)) : "";
    const categoryData = {
      ...req.body,
      image: imagePath
    };
    
    if (!categoryData.url_slug && categoryData.name) {
      categoryData.url_slug = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    
    const newCategory = await CategoryService.createCategory(categoryData);
    res.status(201).json({ success: true, message: "Category created successfully", category: newCategory });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = (req.file.location || req.(file.location || file.path));
    }
    
    const updatedCategory = await CategoryService.updateCategory(req.params.id, updateData);
    res.json({ success: true, message: "Category updated successfully", category: updatedCategory });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const toggleCategory = async (req, res) => {
  try {
    const category = await CategoryService.toggleCategoryStatus(req.params.id);
    res.json({ success: true, category, is_blocked: category.is_blocked });
  } catch (error) {
    sendError(res, error, 404);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    sendError(res, error, 400);
  }
};
