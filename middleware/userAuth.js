import User from "../models/userModel.js";
import Cart from "../models/cartModel.js";
import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";

export const isAuthenticated = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user);
      if (user && !user.isBlocked) {
        res.locals.user = user;
        return next();
      } else {
        req.session.destroy((err) => {
          if (err) console.log("Session destruction error:", err);
          if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ success: false, message: 'Account blocked' });
          }
          res.redirect("/user/login?message=Your account has been blocked by the administrator");
        });
      }
    } catch (error) {
      console.log("Middleware Error:", error);
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ success: false, message: 'Authentication failed' });
      }
      res.redirect("/user/login");
    }
  } else {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        unauthenticated: true 
      });
    }
    res.redirect("/user/login");
  }
};

export const isAlreadyLoggedIn = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user);

      if (user && !user.isBlocked) {
        return res.redirect("/user/dashboard");
      }

      if (user && user.isBlocked) {
        return req.session.destroy((err) => {
          if (err) console.log("Session destruction error:", err);
          return res.redirect("/user/login?message=Your account has been blocked");
        });
      }

    } catch (error) {
      console.log("Middleware Error:", error);
    }
  }

  //  Always continue if not redirected
  next();
};

export const isBlocked = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        return req.session.destroy((err) => {
          if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(403).json({ success: false, message: 'Account blocked' });
          }
          res.redirect("/user/login?message=Your account has been blocked");
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
  next();
};

// no cache

export const noCache = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

export const userContext = async (req, res, next) => {
  try {
    const userId = req.session.user;
    let user = null;
    let cartCount = 0;
    let wishlistCount = 0;
    let wishlistProductIds = [];

    if (userId) {
      user = await User.findById(userId);
      const cart = await Cart.findOne({ userId });
      if (cart && cart.items) {
        cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);
      }

      const wishlist = await Wishlist.findOne({ userId }).populate({
        path: "products.productId",
        populate: { path: "category_id" }
      });
      if (wishlist && wishlist.products) {
        // Count ALL products in the wishlist for the badge (including blocked ones)
        // — same as how cart counts all items even unavailable ones.
        // The product is still saved in the wishlist, it's just currently blocked.
        const validProducts = wishlist.products.filter(item => item && item.productId);
        wishlistCount = validProducts.length;

        // wishlistProductIds only includes available products — used to fill
        // the heart icon on shop/home pages (don't mark blocked products as wishlisted)
        wishlistProductIds = validProducts
          .filter(item =>
            item.productId.is_blocked !== true &&
            item.productId.category_id &&
            item.productId.category_id.is_blocked !== true
          )
          .map(p => p.productId._id.toString());
      }
    }

    res.locals.user = user;
    res.locals.cartCount = cartCount;
    res.locals.wishlistCount = wishlistCount;
    res.locals.wishlistProductIds = wishlistProductIds;
    next();
  } catch (error) {
    console.error("User Context Middleware Error:", error);
    next();
  }
};

