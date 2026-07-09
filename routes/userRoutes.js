import express from "express";
import passport from "passport";
import { upload } from "../config/multer.js";
const router = express.Router();
import * as userAuth from "../middleware/userAuth.js";
router.use(userAuth.noCache);
import * as usercontroller from "../controller/usercontroller/user.auth.js";
import * as PageController from "../controller/usercontroller/pages.controller.js";
import * as Profile from "../controller/usercontroller/profile.js";
import * as Address from "../controller/usercontroller/address.js";
import * as Checkout from "../controller/usercontroller/checkoutController.js"
import * as Order from "../controller/usercontroller/orderController.js";
import * as Payment from "../controller/usercontroller/paymentController.js";
import * as Wallet from "../controller/usercontroller/walletController.js";
import * as ReviewController from "../controller/usercontroller/reviewController.js";


// Authentication
router.post('/login', userAuth.isAlreadyLoggedIn, usercontroller.login);
router.post('/signup', userAuth.isAlreadyLoggedIn, usercontroller.signup);
router.post('/otp', userAuth.isAlreadyLoggedIn, usercontroller.Verifyotp);
router.post('/resend-otp', usercontroller.resendOTP);
router.post('/forgot-password', userAuth.isAlreadyLoggedIn, usercontroller.fogotPassword);
router.post('/reset-password', userAuth.isAlreadyLoggedIn, usercontroller.reset_Password);

// Google OAuth
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/user/login" }),
  (req, res) => {
    req.session.user = req.user._id;
    req.session.loginMethod = 'google';
    res.redirect(303, "/user/dashboard");
  }
);

// Pages
router.get('/', userAuth.isBlocked, PageController.LandingOrHome_load);
router.get('/shop', userAuth.isBlocked, PageController.ShopPage_load);
router.get('/product/:id', userAuth.isBlocked, PageController.ProductDetails_load);
router.get('/contact', userAuth.isBlocked, PageController.ContactPage_load);
router.get('/about', userAuth.isBlocked, PageController.AboutPage_load);
router.post('/product/:id/review', userAuth.isAuthenticated, userAuth.isBlocked, ReviewController.addReview);
router.delete('/product/:id/review/:reviewId', userAuth.isAuthenticated, userAuth.isBlocked, ReviewController.deleteReview);

import * as cartController from "../controller/usercontroller/cartController.js";
import * as WishlistController from "../controller/usercontroller/wishlistController.js";
// Cart
router.get('/cart', userAuth.isAuthenticated, userAuth.isBlocked, cartController.getCartView);
router.post('/cart/add', userAuth.isAuthenticated, userAuth.isBlocked, cartController.addItem);
router.post('/cart/update', userAuth.isAuthenticated, userAuth.isBlocked, cartController.updateQuantity);
router.post('/cart/remove', userAuth.isAuthenticated, userAuth.isBlocked, cartController.removeItem);
router.post('/cart/validate-checkout', userAuth.isAuthenticated, userAuth.isBlocked, cartController.validateCheckout);

// Checkout
router.get('/checkout', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.getCheckoutView);
router.post('/checkout/place-order', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.placeOrder);
router.post('/checkout/place-order-failed', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.placeOrderFailed);
router.post('/checkout/retry-order', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.retryOrder);
router.post('/checkout/apply-coupon', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.applyCoupon);
router.post('/checkout/remove-coupon', userAuth.isAuthenticated, userAuth.isBlocked, Checkout.removeCoupon);
//payments
router.post('/payment/create-order',userAuth.isAuthenticated,userAuth.isBlocked,Payment.createOrder);
router.post('/payment/verify',userAuth.isAuthenticated,userAuth.isBlocked,Payment.verifyPayment);

// Wallet
router.get('/wallet', userAuth.isAuthenticated, userAuth.isBlocked, Wallet.getWalletView);
router.get('/wallet/balance', userAuth.isAuthenticated, userAuth.isBlocked, Wallet.getWalletBalance);

// Orders
router.get('/orders', userAuth.isAuthenticated, userAuth.isBlocked, Order.getOrders);
router.get('/orders/:orderId', userAuth.isAuthenticated, userAuth.isBlocked, Order.getOrderDetails);
router.post('/orders/:orderId/cancel', userAuth.isAuthenticated, userAuth.isBlocked, Order.cancelOrder);
router.post('/orders/:orderId/return', userAuth.isAuthenticated, userAuth.isBlocked, Order.returnOrder);
router.post('/orders/:orderId/items/:itemId/cancel', userAuth.isAuthenticated, userAuth.isBlocked, Order.cancelOrderItem);
router.post('/orders/:orderId/items/:itemId/return', userAuth.isAuthenticated, userAuth.isBlocked, Order.returnOrderItem);
router.get('/orders/:orderId/invoice', userAuth.isAuthenticated, userAuth.isBlocked, Order.downloadInvoice);



// Wishlist
router.get('/wishlist', userAuth.isAuthenticated, userAuth.isBlocked, WishlistController.getWishlistView);
router.post('/wishlist/add', userAuth.isAuthenticated, userAuth.isBlocked, WishlistController.toggleWishlist);
router.post('/wishlist/remove', userAuth.isAuthenticated, userAuth.isBlocked, WishlistController.removeFromWishlist);


router.get('/dashboard', userAuth.isAuthenticated, PageController.Dashboard_load);

// Profile
router.get('/profile', userAuth.isAuthenticated, userAuth.isBlocked, Profile.getProfileDetails);
router.put('/profile/edit', userAuth.isAuthenticated, userAuth.isBlocked, upload.single("avatar"), Profile.editProfile);
router.post('/profile/change-password', userAuth.isAuthenticated, userAuth.isBlocked, Profile.changePassword);
router.post('/profile/change-email/request-otp', userAuth.isAuthenticated, userAuth.isBlocked, Profile.requestChangeEmailOtp);
router.post('/profile/change-email/verify-otp', userAuth.isAuthenticated, userAuth.isBlocked, Profile.verifyChangeEmailOtp);
router.post('/profile/change-email', userAuth.isAuthenticated, userAuth.isBlocked, Profile.sendChangeEmailLink);
router.post('/profile/change-email/verify', Profile.verifyChangeEmailLink);
// Address
router.get('/address', userAuth.isAuthenticated, Address.load_address);
router.get('/address/add', userAuth.isAuthenticated, Address.load_addAddress);
router.get('/add-address', userAuth.isAuthenticated, Address.load_addAddress);
router.post('/address/add', userAuth.isAuthenticated, Address.addAddress);
router.get('/address/edit/:id', userAuth.isAuthenticated, Address.load_editAddress);
router.get('/edit-address/:id', userAuth.isAuthenticated, Address.load_editAddress);
router.post('/address/edit/:id', userAuth.isAuthenticated, Address.editAddress);
router.get('/address/delete/:id', userAuth.isAuthenticated, Address.deleteAddress);
router.get('/delete-address/:id', userAuth.isAuthenticated, Address.deleteAddress);
router.delete('/address/delete/:id', userAuth.isAuthenticated, Address.deleteAddress);

router.get('/address/set-default/:id', userAuth.isAuthenticated, Address.setDefaultAddress);
router.get('/settings', userAuth.isAuthenticated);

router.get('/logout', userAuth.isAuthenticated, usercontroller.isLogout);

export default router;
