import express from "express";
import * as Dashboard from "../controller/admincontroller/dashboard.js";
import * as Customers from "../controller/admincontroller/customers.js";
import * as AdminAuthController from "../controller/admincontroller/admin.auth.js";
import * as adminAuth from "../middleware/adminAuth.js";
import * as CategoryController from "../controller/admincontroller/categoryController.js";
import * as ProductController from "../controller/admincontroller/productController.js";
import { uploadProduct } from "../config/productMulter.js";
import * as orderController from "../controller/admincontroller/orderController.js";
import * as CouponController from "../controller/admincontroller/couponController.js";
import * as OfferController from "../controller/admincontroller/offerController.js";
import * as ReportController from "../controller/admincontroller/reportController.js";
import Order from "../models/ordersModel.js";

const router = express.Router();

router.use(adminAuth.noCache);

router.use(async (req, res, next) => {
    try {
        const returnCount = await Order.countDocuments({ "orderedItems.status": "Return Request" });
        res.locals.returnCount = returnCount;
    } catch (error) {
        res.locals.returnCount = 0;
    }
    next();
});

router.get("/login", adminAuth.isAdminAlreadyLoggedIn, AdminAuthController.loadLogin);

router.post("/login", adminAuth.isAdminAlreadyLoggedIn, AdminAuthController.login);

router.get("/dashboard", adminAuth.isAdminLoggedIn, Dashboard.loadDashboard);
router.get("/dashboard/chart", adminAuth.isAdminLoggedIn, Dashboard.getChartData);

router.get("/users", adminAuth.isAdminLoggedIn, Customers.getUsers);

router.post("/users/:id/block", adminAuth.isAdminLoggedIn, Customers.blockUser);

router.get("/logout", AdminAuthController.logout);

// Category
router.get("/category", adminAuth.isAdminLoggedIn, CategoryController.categoryInfo);
router.get("/addCategory", adminAuth.isAdminLoggedIn, CategoryController.getAddCategoryPage);
router.post("/addCategory", adminAuth.isAdminLoggedIn, CategoryController.addCategory);

router.get("/toggleCategory/:id", adminAuth.isAdminLoggedIn, CategoryController.toggleCategoryStatus);
router.post("/editCategory/:id", adminAuth.isAdminLoggedIn, CategoryController.editCategory);
router.get("/editCategory/:id", adminAuth.isAdminLoggedIn, CategoryController.getEditCategoryPage);
router.delete("/deleteCategory/:id", adminAuth.isAdminLoggedIn, CategoryController.deleteCategory);

// Product
router.get("/product", adminAuth.isAdminLoggedIn, ProductController.loadProducts);
router.get("/addProduct", adminAuth.isAdminLoggedIn, ProductController.getAddProductPage);
router.post("/product/add", adminAuth.isAdminLoggedIn, ProductController.addProduct); // No images here

router.get("/product/manage-variants/:id", adminAuth.isAdminLoggedIn, ProductController.getManageVariantsPage);
router.post("/product/:id/variants/add", adminAuth.isAdminLoggedIn, uploadProduct.array('images', 5), ProductController.addVariant);
router.post("/product/:id/variants/edit/:variantId", adminAuth.isAdminLoggedIn, uploadProduct.array('images', 5), ProductController.updateVariant);
router.delete("/product/:id/variants/delete/:variantId", adminAuth.isAdminLoggedIn, ProductController.deleteVariant);

router.get("/product/edit/:id", adminAuth.isAdminLoggedIn, ProductController.getEditProductPage);
router.post("/product/edit/:id", adminAuth.isAdminLoggedIn, ProductController.updateProduct); // No images here
router.post("/product/toggle-status/:id", adminAuth.isAdminLoggedIn, ProductController.toggleProductStatus);
router.delete("/product/delete/:id", adminAuth.isAdminLoggedIn, ProductController.deleteProduct);


//orders
router.get("/orders", adminAuth.isAdminLoggedIn, orderController.loadOrders);
router.get("/orders/:orderId/invoice", adminAuth.isAdminLoggedIn, orderController.downloadInvoiceAdmin);
router.get("/orders/:orderId", adminAuth.isAdminLoggedIn, orderController.getOrderDetails);
router.post("/orders/update-status", adminAuth.isAdminLoggedIn, orderController.updateStatus);
router.post("/orders/update-item-status", adminAuth.isAdminLoggedIn, orderController.updateOrderItemStatus);

router.get("/returns", adminAuth.isAdminLoggedIn, orderController.loadReturns);

// Coupons
router.get("/coupons", adminAuth.isAdminLoggedIn, CouponController.loadCoupons);
router.get("/coupons/add", adminAuth.isAdminLoggedIn, CouponController.getAddCouponPage);
router.get("/coupons/edit/:id", adminAuth.isAdminLoggedIn, CouponController.getEditCouponPage);
router.post("/coupons/create", adminAuth.isAdminLoggedIn, CouponController.createCoupon);
router.post("/coupons/update/:id", adminAuth.isAdminLoggedIn, CouponController.updateCoupon);
router.post("/coupons/toggle/:id", adminAuth.isAdminLoggedIn, CouponController.toggleCouponStatus);
router.delete("/coupons/delete/:id", adminAuth.isAdminLoggedIn, CouponController.deleteCoupon);

// Offers
router.get("/offers", adminAuth.isAdminLoggedIn, OfferController.loadOffers);
router.get("/offers/add", adminAuth.isAdminLoggedIn, OfferController.getAddOfferPage);
router.get("/offers/edit/:id", adminAuth.isAdminLoggedIn, OfferController.getEditOfferPage);
router.post("/offers/create", adminAuth.isAdminLoggedIn, OfferController.createOffer);
router.put("/offers/edit/:id", adminAuth.isAdminLoggedIn, OfferController.updateOffer);
router.post("/offers/toggle/:id", adminAuth.isAdminLoggedIn, OfferController.toggleOfferStatus);
router.delete("/offers/delete/:id", adminAuth.isAdminLoggedIn, OfferController.deleteOffer);

// Reports
router.get("/reports", adminAuth.isAdminLoggedIn, ReportController.loadReports);


export default router;
