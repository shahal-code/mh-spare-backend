import express from "express";
import { verifyAdminJWT } from "../middleware/jwtMiddleware.js";
import { vendorAuthLimiter } from "../middleware/rateLimiter.js";

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

// Validation Middleware
import { validateRequest } from "../middleware/validationMiddleware.js";
import { validateProductId, validateProductBody, validateVariantParams } from "../middleware/productValidation.js";

// Config
import { uploadProduct } from "../config/productMulter.js";
import { uploadCategory } from "../config/categoryMulter.js";
import { uploadOffer } from "../config/offerMulter.js";
import { uploadKyc } from "../config/kycMulter.js";

const router = express.Router();

// ========================
// Authentication & Profile
// ========================
router.post("/login", vendorAuthLimiter, AuthApi.login);
router.post("/logout", AuthApi.logout);

router.use(verifyAdminJWT);
router.get("/session", AuthApi.session);

// Current Vendor Profile Routes
router.patch("/profile/phone", ProfileApi.updateOwnPhone);
router.patch("/profile/password", ProfileApi.updateOwnPassword);
router.post("/profile/kyc", uploadKyc.fields([{ name: "idProof", maxCount: 1 }, { name: "businessLicense", maxCount: 1 }]), ProfileApi.uploadKycDocuments);

// Dashboard
router.get("/dashboard", DashboardApi.dashboard);
router.get("/dashboard/chart", DashboardApi.dashboardChart);

import { requireVerifiedKyc } from "../middleware/rbacMiddleware.js";

// Categories
router.get("/categories/options", CategoryApi.categoryOptions);
router.get("/categories", CategoryApi.categories);
router.get("/categories/:id", CategoryApi.category);
router.post("/categories", requireVerifiedKyc, uploadCategory.single("image"), CategoryApi.createCategory);
router.put("/categories/:id", requireVerifiedKyc, uploadCategory.single("image"), CategoryApi.updateCategory);
router.patch("/categories/:id/toggle", requireVerifiedKyc, CategoryApi.toggleCategory);
router.delete("/categories/:id", requireVerifiedKyc, CategoryApi.deleteCategory);

// Products
router.get("/products/options", ProductApi.productOptions);
router.get("/products", ProductApi.products);
router.get("/products/:id", validateProductId, validateRequest, ProductApi.product);
router.post("/products", requireVerifiedKyc, uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), validateProductBody, validateRequest, ProductApi.createProduct);
router.put("/products/:id", requireVerifiedKyc, validateProductId, validateRequest, uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), validateProductBody, validateRequest, ProductApi.updateProduct);
router.patch("/products/:id/toggle", requireVerifiedKyc, validateProductId, validateRequest, ProductApi.toggleProduct);
router.patch("/products/:id/quick-edit", requireVerifiedKyc, validateProductId, validateRequest, ProductApi.quickEditProduct);
router.post("/products/bulk/toggle", requireVerifiedKyc, ProductApi.bulkToggleProducts);
router.post("/products/bulk/delete", requireVerifiedKyc, ProductApi.bulkDeleteProducts);
router.delete("/products/:id", requireVerifiedKyc, validateProductId, validateRequest, ProductApi.deleteProduct);
router.post("/products/:id/variants", requireVerifiedKyc, validateProductId, validateRequest, uploadProduct.array("images", 5), ProductApi.createVariant);
router.put("/products/:id/variants/:variantId", requireVerifiedKyc, validateVariantParams, validateRequest, uploadProduct.array("images", 5), ProductApi.updateVariant);
router.delete("/products/:id/variants/:variantId", requireVerifiedKyc, validateVariantParams, validateRequest, ProductApi.deleteVariant);

// Orders
router.get("/orders/returns", OrderApi.returns);
router.get("/orders", OrderApi.orders);
router.get("/orders/:orderId", OrderApi.order);
router.post("/orders/update-status", OrderApi.updateOrderStatus);
router.post("/orders/update-payment-status", OrderApi.updatePaymentStatus);
router.post("/orders/update-item-status", OrderApi.updateOrderItemStatus);
router.post("/orders/bulk/status", OrderApi.bulkUpdateStatus);
router.patch("/orders/:id/tracking/:itemId", OrderApi.updateItemTracking);

// Marketing (Coupons, Offers)
router.get("/coupons", MarketingApi.coupons);
router.get("/coupons/:id", MarketingApi.coupon);
router.post("/coupons", requireVerifiedKyc, MarketingApi.createCoupon);
router.put("/coupons/:id", requireVerifiedKyc, MarketingApi.updateCoupon);
router.patch("/coupons/:id/toggle", requireVerifiedKyc, MarketingApi.toggleCoupon);
router.delete("/coupons/:id", requireVerifiedKyc, MarketingApi.deleteCoupon);

router.get("/offers/meta", MarketingApi.offerMeta);
router.get("/offers", MarketingApi.offers);
router.get("/offers/:id", MarketingApi.offer);
router.post("/offers", requireVerifiedKyc, uploadOffer.single("image"), MarketingApi.createOffer);
router.put("/offers/:id", requireVerifiedKyc, uploadOffer.single("image"), MarketingApi.updateOffer);
router.patch("/offers/:id/toggle", requireVerifiedKyc, MarketingApi.toggleOffer);
router.delete("/offers/:id", requireVerifiedKyc, MarketingApi.deleteOffer);

// Reports
router.get("/reports", ReportApi.reports);

// Notifications
router.get("/notifications", NotificationApi.getNotifications);
router.put("/notifications/read", NotificationApi.markNotificationsRead);
router.get("/notifications/stream", NotificationApi.streamNotifications);

export default router;
