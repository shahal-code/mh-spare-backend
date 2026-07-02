import * as ProductService from "../../services/admin/productService.js";
import * as CategoryService from "../../services/admin/categoryService.js";
import Product from "../../models/productModel.js";

// Load Product Inventory Page
export const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const search = req.query.search || "";

        const query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const { products, totalProducts, totalPages } = await ProductService.getAllProducts(query, page, limit);

        const activeProductsCount = await Product.countDocuments({ is_blocked: false });
        const inactiveProductsCount = await Product.countDocuments({ is_blocked: true });

        res.render("admin/product/products", {
            products,
            page,
            totalPages,
            totalProducts,
            limit,
            search,
            activePage: "products",
            activeProductsCount,
            inactiveProductsCount
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Get Add Product Page
export const getAddProductPage = async (req, res) => {
    try {
        const categories = await CategoryService.getAllCategories({ is_blocked: false }, 1, 100); 
        res.render("admin/product/add-product", {
            categories: categories.categories,
            product: null,
            activePage: "products"
        });
    } catch (error) {
        console.error("Error loading add product page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Add New Product via POST
export const addProduct = async (req, res) => {
    try {
        const newProduct = await ProductService.createProduct(req.body);
        res.redirect(`/admin/product/manage-variants/${newProduct._id}`);
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(400).send(`Error: ${error.message}`);
    }
};

// Manage Variants Page
export const getManageVariantsPage = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductService.getProductById(id);
        if (!product) return res.redirect("/admin/product");

        const lastVariant = product.variants && product.variants.length > 0 
            ? product.variants[product.variants.length - 1] 
            : null;

        res.render("admin/product/manage-variants", {
            product,
            lastVariant,
            activePage: "products"
        });
    } catch (error) {
        console.error("Error loading manage variants page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Add Variant
export const addVariant = async (req, res) => {
    try {
        const { id } = req.params;
        await ProductService.addVariant(id, req.body, req.files);
        res.redirect(`/admin/product/manage-variants/${id}`);
    } catch (error) {
        console.error("Error adding variant:", error);
        res.status(400).send(`Error: ${error.message}`);
    }
};

// Update Variant
export const updateVariant = async (req, res) => {
    try {
        const { id, variantId } = req.params;
        await ProductService.updateVariant(id, variantId, req.body, req.files);
        res.redirect(`/admin/product/manage-variants/${id}`);
    } catch (error) {
        console.error("Error updating variant:", error);
        res.status(400).send(`Error: ${error.message}`);
    }
};

// Delete Variant
export const deleteVariant = async (req, res) => {
    try {
        const { id, variantId } = req.params;
        await ProductService.deleteVariant(id, variantId);
        res.status(200).json({ message: "Variant deleted successfully" });
    } catch (error) {
        console.error("Error deleting variant:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get Edit Product Page
export const getEditProductPage = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductService.getProductById(id);
        const categories = await CategoryService.getAllCategories({ is_blocked: false }, 1, 100);

        if (!product) {
            return res.redirect("/admin/product");
        }

        res.render("admin/product/edit-product", {
            product,
            categories: categories.categories,
            activePage: "products"
        });
    } catch (error) {
        console.error("Error loading edit product page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Update Product Info
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await ProductService.updateProduct(id, req.body);
        res.redirect("/admin/product");
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(400).send(`Error: ${error.message}`);
    }
};

// Delete Product
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await ProductService.deleteProduct(id);
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(error.message === "Product not found" ? 404 : 500).json({ 
            error: error.message || "Internal Server Error" 
        });
    }
};

// Toggle Product Block Status
export const toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductService.toggleProductStatus(id);
        res.status(200).json({ 
            message: `Product ${product.is_blocked ? 'blocked' : 'unblocked'} successfully`,
            is_blocked: product.is_blocked 
        });
    } catch (error) {
        console.error("Error toggling product status:", error);
        res.status(500).json({ error: error.message });
    }
};


