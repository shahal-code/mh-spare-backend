import express from "express";
import { verifyAdminJWT } from "../middleware/jwtMiddleware.js";

// Import Modular Controllers
import * as AuthApi from "../controller/superadmin/admin.auth.js";
import * as DashboardApi from "../controller/vendoradmin/dashboardController.js";
import * as ProfileApi from "../controller/vendoradmin/profileController.js";
import * as CategoryApi from "../controller/vendoradmin/categoryController.js";
import * as ProductApi from "../controller/vendoradmin/productController.js";
import * as OrderApi from "../controller/vendoradmin/orderController.js";
import * as MarketingApi from "../controller/vendoradmin/marketingController.js";
import * as ReportApi from "../controller/vendoradmin/reportController.js";
import * as NotificationApi from "../controller/vendoradmin/notificationController.js";

// Config
import { uploadProduct } from "../config/productMulter.js";
import { uploadCategory } from "../config/categoryMulter.js";
import { uploadOffer } from "../config/offerMulter.js";

const router = express.Router();

// Auth (Using SuperAdmin auth for now, as they share the same adminModel)
router.post("/login", AuthApi.login);
router.post("/logout", AuthApi.logout);

router.use(verifyAdminJWT);
router.get("/session", AuthApi.session);

// Current Vendor Profile Routes
router.patch("/profile/phone", ProfileApi.updateOwnPhone);
router.patch("/profile/password", ProfileApi.updateOwnPassword);

// Dashboard
router.get("/dashboard", DashboardApi.dashboard);
router.get("/dashboard/chart", DashboardApi.dashboardChart);

// Categories
router.get("/categories/options", CategoryApi.categoryOptions);
router.get("/categories", CategoryApi.categories);
router.get("/categories/:id", CategoryApi.category);

// Products
router.get("/products/options", ProductApi.productOptions);
router.get("/products", ProductApi.products);
router.get("/products/:id", ProductApi.product);
router.post("/products", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), ProductApi.createProduct);
router.put("/products/:id", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), ProductApi.updateProduct);
router.patch("/products/:id/toggle", ProductApi.toggleProduct);
router.patch("/products/:id/quick-edit", ProductApi.quickEditProduct);
router.post("/products/bulk/toggle", ProductApi.bulkToggleProducts);
router.post("/products/bulk/delete", ProductApi.bulkDeleteProducts);
router.delete("/products/:id", ProductApi.deleteProduct);
router.post("/products/:id/variants", uploadProduct.array("images", 5), ProductApi.createVariant);
router.put("/products/:id/variants/:variantId", uploadProduct.array("images", 5), ProductApi.updateVariant);
router.delete("/products/:id/variants/:variantId", ProductApi.deleteVariant);

// Orders
router.get("/orders/returns", OrderApi.returns);
router.get("/orders", OrderApi.orders);
router.get("/orders/:orderId", OrderApi.order);
router.post("/orders/update-status", OrderApi.updateOrderStatus);
router.post("/orders/update-item-status", OrderApi.updateOrderItemStatus);
router.post("/orders/bulk/status", OrderApi.bulkUpdateStatus);
router.patch("/orders/:id/tracking/:itemId", OrderApi.updateItemTracking);

// Marketing (Coupons, Offers)
router.get("/coupons", MarketingApi.coupons);
router.get("/coupons/:id", MarketingApi.coupon);
router.post("/coupons", MarketingApi.createCoupon);
router.put("/coupons/:id", MarketingApi.updateCoupon);
router.patch("/coupons/:id/toggle", MarketingApi.toggleCoupon);
router.delete("/coupons/:id", MarketingApi.deleteCoupon);

router.get("/offers/meta", MarketingApi.offerMeta);
router.get("/offers", MarketingApi.offers);
router.get("/offers/:id", MarketingApi.offer);
router.post("/offers", uploadOffer.single("image"), MarketingApi.createOffer);
router.put("/offers/:id", uploadOffer.single("image"), MarketingApi.updateOffer);
router.patch("/offers/:id/toggle", MarketingApi.toggleOffer);
router.delete("/offers/:id", MarketingApi.deleteOffer);

// Reports
router.get("/reports", ReportApi.reports);

// Notifications
router.get("/notifications", NotificationApi.getNotifications);
router.put("/notifications/read", NotificationApi.markNotificationsRead);
router.get("/notifications/stream", NotificationApi.streamNotifications);

export default router;
