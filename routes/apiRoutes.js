import express from "express";
import * as apiController from "../controller/apiController.js";
import * as ReviewController from "../controller/usercontroller/reviewController.js";
import * as userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.get("/products", apiController.getLandingProducts);
router.get("/shop", apiController.getShopProducts);
router.get("/products/:id", apiController.getProductDetails);
router.get("/offers", apiController.getActiveOffers);
router.get("/banners", apiController.getActiveBanners);
router.get("/brands", apiController.getBrands);
router.post("/products/:id/reviews", userAuth.isAuthenticated, userAuth.isBlocked, ReviewController.addReview);
router.delete("/products/:id/reviews/:reviewId", userAuth.isAuthenticated, userAuth.isBlocked, ReviewController.deleteReview);

export default router;
