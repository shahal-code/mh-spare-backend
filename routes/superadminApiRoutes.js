import express from "express";
import { verifyAdminJWT } from "../middleware/jwtMiddleware.js";
import { isOwner as enforceOwner } from "../middleware/rbacMiddleware.js";

// Import Modular Controllers
import * as AuthApi from "../controller/superadmin/admin.auth.js";
import * as DashboardApi from "../controller/superadmin/dashboardController.js";
import * as ProfileApi from "../controller/superadmin/profileController.js";
import * as VendorManagementApi from "../controller/superadmin/vendorManagementController.js";
import * as UserManagementApi from "../controller/superadmin/userManagementController.js";
import * as CategoryApi from "../controller/superadmin/categoryController.js";
import * as ProductApi from "../controller/superadmin/productController.js";
import * as OrderApi from "../controller/superadmin/orderController.js";
import * as MarketingApi from "../controller/superadmin/marketingController.js";
import * as ReportApi from "../controller/superadmin/reportController.js";
import * as NotificationApi from "../controller/superadmin/notificationController.js";
import * as PayoutApi from "../controller/superadmin/payoutController.js";
import * as ReviewApi from "../controller/superadmin/reviewController.js";

// Config
import { uploadProduct } from "../config/productMulter.js";
import { uploadCategory } from "../config/categoryMulter.js";
import { uploadOffer } from "../config/offerMulter.js";
import { uploadBanner } from "../config/bannerMulter.js";
import { uploadBrand } from "../config/brandMulter.js";

const router = express.Router();

// Auth
router.post("/login", AuthApi.login);
router.post("/logout", AuthApi.logout);

router.use(verifyAdminJWT);
router.get("/session", AuthApi.session);

// Profile
router.patch("/profile/phone", ProfileApi.updateOwnPhone);
router.patch("/profile/password", ProfileApi.updateOwnPassword);

// Vendor Management (Super Admin Only)
router.post("/vendors/bulk-approve", enforceOwner, VendorManagementApi.bulkApproveVendors);
router.post("/vendors/bulk-block", enforceOwner, VendorManagementApi.bulkBlockVendors);
router.post("/vendors/bulk-delete", enforceOwner, VendorManagementApi.bulkDeleteVendors);
router.get("/vendors", enforceOwner, VendorManagementApi.getVendors);
router.post("/vendors", enforceOwner, VendorManagementApi.createVendor);
router.post("/vendors/:id/approve", enforceOwner, VendorManagementApi.approveVendor);
router.post("/vendors/:id/block", enforceOwner, VendorManagementApi.blockVendor);
router.delete("/vendors/:id", enforceOwner, VendorManagementApi.deleteVendor);
router.put("/vendors/:id", enforceOwner, VendorManagementApi.updateVendorProfile);
router.patch("/vendors/:id/kyc", enforceOwner, VendorManagementApi.updateKycStatus);
router.patch("/vendors/:id/password", enforceOwner, VendorManagementApi.resetVendorPassword);
router.patch("/vendors/:id/phone", enforceOwner, VendorManagementApi.updateVendorPhone);
router.get("/vendors/:id/stats", enforceOwner, VendorManagementApi.vendorStats);
router.get("/vendors/:id/products", enforceOwner, VendorManagementApi.vendorProducts);
router.delete("/vendors/:id/activities", enforceOwner, VendorManagementApi.clearVendorActivities);

// Dashboard
router.get("/dashboard", DashboardApi.dashboard);
router.get("/dashboard/chart", DashboardApi.dashboardChart);

// Users CRM
router.get("/users", UserManagementApi.users);
router.patch("/users/bulk-block", UserManagementApi.bulkToggleUsers);
router.get("/users/:id/details", UserManagementApi.userDetails);
router.post("/users/:id/block", UserManagementApi.toggleUser);

// Categories
router.get("/categories/options", CategoryApi.categoryOptions);
router.get("/categories", CategoryApi.categories);
router.get("/categories/:id", CategoryApi.category);
router.post("/categories", uploadCategory.single("image"), CategoryApi.createCategory);
router.put("/categories/:id", uploadCategory.single("image"), CategoryApi.updateCategory);
router.patch("/categories/:id/toggle", CategoryApi.toggleCategory);
router.delete("/categories/:id", CategoryApi.deleteCategory);

// Products
router.get("/products/options", ProductApi.productOptions);
router.get("/products", ProductApi.products);
router.patch("/products/bulk-approval", enforceOwner, ProductApi.bulkApproveProducts);
router.get("/products/:id", ProductApi.product);
router.post("/products", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), ProductApi.createProduct);
router.put("/products/:id", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), ProductApi.updateProduct);
router.patch("/products/:id/toggle", ProductApi.toggleProduct);
router.patch("/products/:id/approval", enforceOwner, ProductApi.updateProductApproval);
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

// Marketing (Coupons, Offers, Banners, Brands)
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

router.get("/banners", enforceOwner, MarketingApi.banners);
router.post("/banners", enforceOwner, uploadBanner.single("image"), MarketingApi.createBanner);
router.put("/banners/:id", enforceOwner, uploadBanner.single("image"), MarketingApi.updateBanner);
router.delete("/banners/:id", enforceOwner, MarketingApi.deleteBanner);

router.get("/brands", enforceOwner, MarketingApi.brands);
router.post("/brands", enforceOwner, uploadBrand.single("image"), MarketingApi.createBrand);
router.delete("/brands/:id", enforceOwner, MarketingApi.deleteBrand);

// Reports
router.get("/reports", ReportApi.reports);

// Notifications
router.get("/notifications", NotificationApi.getNotifications);
router.put("/notifications/read", NotificationApi.markNotificationsRead);
router.get("/notifications/stream", NotificationApi.streamNotifications);

// Payouts (Super Admin Only)
router.get("/payouts", enforceOwner, PayoutApi.getPayouts);
router.post("/payouts", enforceOwner, PayoutApi.createPayout);
router.get("/payouts/:id", enforceOwner, PayoutApi.getVendorHistory);

// Reviews (Super Admin Only)
router.get("/reviews", enforceOwner, ReviewApi.getReviews);
router.patch("/reviews/:id/toggle", enforceOwner, ReviewApi.toggleStatus);
router.delete("/reviews/:id", enforceOwner, ReviewApi.removeReview);

export default router;
