import * as ProductService from "../services/user/productServices.js";
import * as CategoryService from "../services/user/categoryService.js";

export const getLandingProducts = async (req, res) => {
    try {
        const featuredProducts = await ProductService.getFeaturedProducts(10);
        
        // Transform the Mongoose models into the format expected by our React frontend
        const productsData = featuredProducts.map(p => {
            const variant = p.variants.find(v => v.stock > 0) || p.variants[0];
            const img = (p.variants && p.variants.length > 0 && variant && variant.images && variant.images.length > 0)
                ? variant.images[0]
                : (p.images && p.images.length > 0 ? p.images[0] : '/img/placeholder.jpg');
            const inStock = p.variants.some(v => v.stock > 0);
            
            return {
                id: p._id.toString(),
                name: p.name,
                description: p.description || '',
                img: img,
                inStock: inStock,
                price: variant ? variant.price : 0,
                originalPrice: variant ? variant.originalPrice : null,
                variantId: variant ? variant._id.toString() : null,
                category: p.category_id ? (p.category_id._id || p.category_id).toString() : 'all',
                popular: inStock
            };
        });

        const activeCategories = await CategoryService.getActiveCategories(10);
        const categoriesData = activeCategories.map(c => ({
            id: c._id.toString(),
            name: c.name,
            icon: c.icon || '📦'
        }));

        res.json({ success: true, products: productsData, categories: categoriesData });
    } catch (error) {
        console.error("API Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};
