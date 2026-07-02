import * as ProductService from "../../services/user/productServices.js";
import * as WishlistService from "../../services/user/wishlistServices.js";
import * as CategoryService from "../../services/user/categoryService.js";
import Review from "../../models/reviewModel.js";
import Offer from "../../models/offerModel.js";

export const LandingOrHome_load = async (req, res) => {
    try {
        const featuredProducts = await ProductService.getFeaturedProducts(3);
        const wishlistProductIds = req.session.user ? await WishlistService.getWishlistProductIds(req.session.user) : [];
        const categories = await CategoryService.getActiveCategories(4);

        const currentDate = new Date();
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        }).populate("applicableTo").sort({ createdAt: -1 }).limit(3);

        res.render("user/home/home", {
            path: "/",
            products: featuredProducts,
            user: req.session.user || null,
            wishlistProductIds,
            categories,
            offers: activeOffers
        });
    } catch (error) {
        console.log("Error loading home page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const Dashboard_load = async (req, res) => {
    try {
        const featuredProducts = await ProductService.getFeaturedProducts(3);
        const wishlistProductIds = await WishlistService.getWishlistProductIds(req.session.user);
        const categories = await CategoryService.getActiveCategories(4);

        const currentDate = new Date();
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        }).populate("applicableTo").sort({ createdAt: -1 }).limit(3);

        res.render("user/home/dashboard", {
            path: "/user/dashboard",
            products: featuredProducts,
            user: req.session.user || null,
            wishlistProductIds,
            categories,
            offers: activeOffers
        });
    } catch (error) {
        console.log("Error loading dashboard:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const ContactPage_load = async (req, res) => {
    try {
        res.render("user/home/contact", { path: "/user/contact" });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const AboutPage_load = async (req, res) => {
    try {
        res.render("user/home/about", { path: "/user/about" });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const ShopPage_load = async (req, res) => {
    try {
        // Pass everything from the URL (?search=xx&sort=yy) to the service
        const data = await ProductService.getShopData(req.query);
        const wishlistProductIds = await WishlistService.getWishlistProductIds(req.session.user);
        const cart = req.session.user ? await (await import("../../services/user/cartService.js")).getCart(req.session.user) : { items: [] };

        res.render("user/shop/shop", {
            path: "/user/shop",
            ...data, // This spreads products, categories, totalPages, etc.
            query: req.query, // Pass query back to EJS to keep search text in input
            wishlistProductIds,
            cart
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};


export const page_404 = async (req, res) => {
    try {
        res.status(404).render("error/404", { message: "The page you are looking for has been upgraded or moved to a different dimension." });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const Settings = async (req, res) => {
    try {
        res.render("views/settings");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("internal server Eroor");
    }
}
export const ProductDetails_load = async (req, res) => {
    try {
        const productId = req.params.id;
        const data = await ProductService.getProductDetails(productId);

        if (!data) {
            // Check if product exists but is blocked
            const productCheck = await ProductService.checkProductAvailability(productId);

            if (productCheck && (productCheck.is_blocked || (productCheck.category_id && productCheck.category_id.is_blocked))) {
                const wishlistProductIds = req.session.user ? await WishlistService.getWishlistProductIds(req.session.user) : [];
                const cart = req.session.user ? await (await import("../../services/user/cartService.js")).getCart(req.session.user) : { items: [] };

                return res.render('user/shop/productDetails', {
                    product: productCheck,
                    relatedProducts: [],
                    cart,
                    user: req.session.user || null,
                    path: '/user/product',
                    wishlistProductIds,
                    isUnavailable: true,
                    unavailableMessage: "This product is currently unavailable.",
                    reviews: [],
                    averageRating: 0,
                    totalRatings: 0
                })
            }



            return res.status(404).render('error/404', { message: "The product you are looking for does not exist." });
        }

        const wishlistProductIds = await WishlistService.getWishlistProductIds(req.session.user);

        // Fetch reviews
        const reviews = await Review.find({ product: productId }).populate('user', 'fullname profileImage').sort({ createdAt: -1 });
        let averageRating = 0;
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
            averageRating = Math.round((sum / reviews.length) * 10) / 10; // keep as number, 1 decimal precision
        }

        // Fetch cart to show current quantities
        const cart = req.session.user ? await (await import("../../services/user/cartService.js")).getCart(req.session.user) : { items: [] };

        res.render('user/shop/productDetails', {
            ...data,
            cart,
            user: req.session.user || null,
            path: '/user/product',
            wishlistProductIds,
            reviews,
            averageRating,
            totalRatings: reviews.length
        });
    } catch (error) {
        console.error("Error loading product details:", error);
        res.status(500).send("Server Error");
    }
}
