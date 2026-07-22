import * as ProductService from "../services/user/productServices.js";
import * as CategoryService from "../services/user/categoryService.js";
import Review from "../models/reviewModel.js";
import Offer from "../models/offerModel.js";
import Banner from "../models/bannerModel.js";

const PLACEHOLDER_IMAGE = "/img/placeholder.jpg";

const toId = (value) => {
    if (!value) return null;
    if (value._id) return value._id.toString();
    return value.toString();
};

const normalizeCategory = (category) => {
    if (!category) return { id: "all", name: "All" };
    return {
        id: toId(category),
        name: category.name || "Uncategorized",
        icon: category.icon || "package",
        image: category.image || ""
    };
};

const pickVariant = (product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants.find(v => Number(v.stock || 0) > 0) || variants[0] || null;
};

const pickImage = (product, variant) => {
    if (variant?.images?.length) return variant.images[0];
    if (product.images?.length) return product.images[0];
    if (product.img) return product.img;
    if (product.thumbnail) return product.thumbnail;
    if (product.image) return product.image;
    return PLACEHOLDER_IMAGE;
};

const normalizeVariant = (variant) => ({
    id: toId(variant),
    _id: toId(variant),
    price: Number(variant?.price || 0),
    originalPrice: variant?.originalPrice ? Number(variant.originalPrice) : null,
    stock: Number(variant?.stock || 0),
    images: Array.isArray(variant?.images) ? variant.images : [],
    processor: variant?.processor || "",
    processorBrand: variant?.processorBrand || "",
    ram: variant?.ram || "",
    gpu: variant?.gpu || "",
    storage: variant?.storage || "",
    size: variant?.size || "",
    color: variant?.color || ""
});

const normalizeProduct = (product) => {
    const variant = pickVariant(product);
    const variants = Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [];
    const category = normalizeCategory(product.category_id || product.category);
    const inStock = variants.length ? variants.some(v => v.stock > 0) : Boolean(product.inStock);
    const price = variant ? Number(variant.price || 0) : Number(product.price || 0);
    const originalPrice = variant?.originalPrice ? Number(variant.originalPrice) : (product.originalPrice || null);

    return {
        id: toId(product),
        _id: toId(product),
        name: product.name || "Unnamed product",
        description: product.description || "",
        img: pickImage(product, variant),
        image: pickImage(product, variant),
        images: product.images || [],
        thumbnail: product.thumbnail || "",
        highlights: Array.isArray(product.highlights) ? product.highlights : [],
        specifications: product.specifications || {},
        material: product.material || "",
        inStock,
        price,
        originalPrice,
        variantId: toId(variant),
        category: category.id,
        categoryName: category.name,
        categoryData: category,
        variants,
        popular: inStock,
        createdAt: product.createdAt || null,
        offer: product.offer || null
    };
};

export const getLandingProducts = async (req, res) => {
    try {
        const featuredProducts = await ProductService.getFeaturedProducts(10);
        const productsData = featuredProducts.map(normalizeProduct);

        const activeCategories = await CategoryService.getActiveCategories(10);
        const categoriesData = activeCategories.map(normalizeCategory);

        res.json({ success: true, products: productsData, categories: categoriesData });
    } catch (error) {
        console.error("API Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

export const getShopProducts = async (req, res) => {
    try {
        const data = await ProductService.getShopData(req.query);
        res.json({
            success: true,
            products: (data.products || []).map(normalizeProduct),
            categories: (data.categories || []).map(normalizeCategory),
            totalProducts: data.totalProducts || 0,
            currentPage: data.currentPage || 1,
            totalPages: data.totalPages || 1
        });
    } catch (error) {
        console.error("API Error fetching shop products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch shop products" });
    }
};

const normalizeReview = (review) => ({
    id: toId(review),
    _id: toId(review),
    rating: Number(review.rating || 0),
    comment: review.comment || "",
    createdAt: review.createdAt || null,
    user: review.user ? {
        id: toId(review.user),
        _id: toId(review.user),
        fullname: review.user.fullname || "User",
        profileImage: review.user.profileImage || ""
    } : { fullname: "User", profileImage: "" }
});

const getReviewSummary = async (productId) => {
    const reviews = await Review.find({ product: productId })
        .populate("user", "fullname profileImage")
        .sort({ createdAt: -1 })
        .lean();
    const averageRating = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length) * 10) / 10
        : 0;

    return {
        reviews: reviews.map(normalizeReview),
        averageRating,
        totalRatings: reviews.length
    };
};

export const getProductDetails = async (req, res) => {
    try {
        const data = await ProductService.getProductDetails(req.params.id);
        if (!data?.product) {
            const productCheck = await ProductService.checkProductAvailability(req.params.id);
            if (productCheck) {
                return res.json({
                    success: true,
                    product: { ...normalizeProduct(productCheck), isUnavailable: true, unavailableMessage: "This product is currently unavailable." },
                    relatedProducts: [],
                    reviews: [],
                    averageRating: 0,
                    totalRatings: 0
                });
            }
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const reviewSummary = await getReviewSummary(req.params.id);
        res.json({
            success: true,
            product: normalizeProduct(data.product),
            relatedProducts: (data.relatedProducts || []).map(normalizeProduct),
            ...reviewSummary
        });
    } catch (error) {
        console.error("API Error fetching product details:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product details" });
    }
};

export const getActiveOffers = async (req, res) => {
    try {
        const currentDate = new Date();
        const offers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).sort({ endDate: 1 }).lean();
        
        // Find the full product for each offer so we can render DealsCarousel
        for (let offer of offers) {
            if (offer.applicableModel === "Product" && offer.applicableTo) {
                const productCheck = await ProductService.getProductDetails(offer.applicableTo);
                if (productCheck?.product) {
                    offer.productData = normalizeProduct(productCheck.product);
                }
            }
        }

        res.json({ success: true, offers });
    } catch (error) {
        console.error("API Error fetching active offers:", error);
        res.status(500).json({ success: false, message: "Failed to fetch active offers" });
    }
};

export const getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
        res.json({ success: true, banners });
    } catch (error) {
        console.error("API Error fetching active banners:", error);
        res.status(500).json({ success: false, message: "Failed to fetch active banners" });
    }
};

export const getBrands = async (req, res) => {
    try {
        const Brand = (await import('../models/brandModel.js')).default;
        const brands = await Brand.find().sort({ createdAt: -1 });
        res.json({ success: true, brands });
    } catch (error) {
        console.error("API Error fetching brands:", error);
        res.status(500).json({ success: false, message: "Failed to fetch brands" });
    }
};
