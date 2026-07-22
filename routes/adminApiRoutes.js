import express from "express";
import * as AdminApi from "../controller/admincontroller/adminApiController.js";
import { verifyAdminJWT } from "../middleware/jwtMiddleware.js";
import { isOwner as enforceOwner } from "../middleware/rbacMiddleware.js";
import * as AuthApi from "../controller/admincontroller/admin.auth.js";
import { uploadProduct } from "../config/productMulter.js";
import { uploadCategory } from "../config/categoryMulter.js";
import { uploadOffer } from "../config/offerMulter.js";
import { uploadBanner } from "../config/bannerMulter.js";

const router = express.Router();

router.post("/login", AuthApi.login);
router.post("/logout", AuthApi.logout);

router.use(verifyAdminJWT);

router.get("/session", AuthApi.session);

// Current Admin Profile Routes
router.patch("/profile/phone", AdminApi.updateOwnPhone);
router.patch("/profile/password", AdminApi.updateOwnPassword);

// Owner-only routes for managing admins
router.get("/vendors", enforceOwner, AdminApi.getVendors);
router.post("/vendors", enforceOwner, AdminApi.createVendor);
router.post("/vendors/:id/approve", enforceOwner, AdminApi.approveVendor);
router.post("/vendors/:id/block", enforceOwner, AdminApi.blockVendor);
router.delete("/vendors/:id", enforceOwner, AdminApi.deleteVendor);
router.patch("/vendors/:id/password", enforceOwner, AdminApi.resetVendorPassword);
router.patch("/vendors/:id/phone", enforceOwner, AdminApi.updateVendorPhone);
router.get("/vendors/:id/stats", enforceOwner, AdminApi.vendorStats);
router.get("/vendors/:id/products", enforceOwner, AdminApi.vendorProducts);

router.get("/dashboard", AdminApi.dashboard);
router.get("/dashboard/chart", AdminApi.dashboardChart);

router.get("/users", AdminApi.users);
router.post("/users/:id/block", AdminApi.toggleUser);

router.get("/categories/options", AdminApi.categoryOptions);
router.get("/categories", AdminApi.categories);
router.get("/categories/:id", AdminApi.category);
router.post("/categories", uploadCategory.single("image"), AdminApi.createCategory);
router.put("/categories/:id", uploadCategory.single("image"), AdminApi.updateCategory);
router.patch("/categories/:id/toggle", AdminApi.toggleCategory);
router.delete("/categories/:id", AdminApi.deleteCategory);

router.get("/products/options", AdminApi.productOptions);
router.get("/products", AdminApi.products);
router.get("/products/:id", AdminApi.product);
router.post("/products", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), AdminApi.createProduct);
router.put("/products/:id", uploadProduct.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 5 }]), AdminApi.updateProduct);
router.patch("/products/:id/toggle", AdminApi.toggleProduct);
router.patch("/products/:id/approval", enforceOwner, AdminApi.updateProductApproval);
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
router.post("/offers", uploadOffer.single("image"), AdminApi.createOffer);
router.put("/offers/:id", uploadOffer.single("image"), AdminApi.updateOffer);
router.patch("/offers/:id/toggle", AdminApi.toggleOffer);
router.delete("/offers/:id", AdminApi.deleteOffer);

router.get("/banners", enforceOwner, AdminApi.banners);
router.post("/banners", enforceOwner, uploadBanner.single("image"), AdminApi.createBanner);
router.put("/banners/:id", enforceOwner, uploadBanner.single("image"), AdminApi.updateBanner);
router.delete("/banners/:id", enforceOwner, AdminApi.deleteBanner);

import { uploadBrand } from "../config/brandMulter.js";
router.get("/brands", enforceOwner, AdminApi.brands);
router.post("/brands", enforceOwner, uploadBrand.single("image"), AdminApi.createBrand);
router.delete("/brands/:id", enforceOwner, AdminApi.deleteBrand);

router.get("/reports", AdminApi.reports);

export default router;


