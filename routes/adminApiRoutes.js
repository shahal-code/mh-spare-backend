import express from "express";
import * as AdminApi from "../controller/admincontroller/adminApiController.js";
import * as adminAuth from "../middleware/adminAuth.js";
import { uploadProduct } from "../config/productMulter.js";

const router = express.Router();

const isAdminApiLoggedIn = (req, res, next) => {
  if (req.session.admin) return next();
  res.status(401).json({ authenticated: false, message: "Admin login required" });
};

router.use(adminAuth.noCache);

router.post("/login", AdminApi.login);
router.get("/session", AdminApi.session);
router.post("/logout", AdminApi.logout);

router.use(isAdminApiLoggedIn);

router.get("/dashboard", AdminApi.dashboard);
router.get("/dashboard/chart", AdminApi.dashboardChart);

router.get("/users", AdminApi.users);
router.post("/users/:id/block", AdminApi.toggleUser);

router.get("/categories/options", AdminApi.categoryOptions);
router.get("/categories", AdminApi.categories);
router.get("/categories/:id", AdminApi.category);
router.post("/categories", AdminApi.createCategory);
router.put("/categories/:id", AdminApi.updateCategory);
router.patch("/categories/:id/toggle", AdminApi.toggleCategory);
router.delete("/categories/:id", AdminApi.deleteCategory);

router.get("/products/options", AdminApi.productOptions);
router.get("/products", AdminApi.products);
router.get("/products/:id", AdminApi.product);
router.post("/products", AdminApi.createProduct);
router.put("/products/:id", AdminApi.updateProduct);
router.patch("/products/:id/toggle", AdminApi.toggleProduct);
router.delete("/products/:id", AdminApi.deleteProduct);
router.post("/products/:id/variants", uploadProduct.array("images", 5), AdminApi.createVariant);
router.put("/products/:id/variants/:variantId", uploadProduct.array("images", 5), AdminApi.updateVariant);
router.delete("/products/:id/variants/:variantId", AdminApi.deleteVariant);

router.get("/orders/returns", AdminApi.returns);
router.get("/orders", AdminApi.orders);
router.get("/orders/:orderId", AdminApi.order);
router.post("/orders/update-status", AdminApi.updateOrderStatus);
router.post("/orders/update-item-status", AdminApi.updateOrderItemStatus);

router.get("/coupons", AdminApi.coupons);
router.get("/coupons/:id", AdminApi.coupon);
router.post("/coupons", AdminApi.createCoupon);
router.put("/coupons/:id", AdminApi.updateCoupon);
router.patch("/coupons/:id/toggle", AdminApi.toggleCoupon);
router.delete("/coupons/:id", AdminApi.deleteCoupon);

router.get("/offers/meta", AdminApi.offerMeta);
router.get("/offers", AdminApi.offers);
router.get("/offers/:id", AdminApi.offer);
router.post("/offers", AdminApi.createOffer);
router.put("/offers/:id", AdminApi.updateOffer);
router.patch("/offers/:id/toggle", AdminApi.toggleOffer);
router.delete("/offers/:id", AdminApi.deleteOffer);

router.get("/reports", AdminApi.reports);

export default router;
