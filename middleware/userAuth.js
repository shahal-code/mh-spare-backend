import User from "../models/userModel.js";
import Cart from "../models/cartModel.js";
import Wishlist from "../models/wishlistModel.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

const extractUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type === "user") return decoded.id;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const isAuthenticated = async (req, res, next) => {
  const userId = extractUserId(req);
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && !user.isBlocked) {
        res.locals.user = user;
        req.user = user;
        return next();
      } else {
        return res.status(403).json({ success: false, message: 'Account blocked by administrator' });
      }
    } catch (error) {
      console.error("Middleware Error:", error);
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Authentication required', unauthenticated: true });
  }
};

export const isAlreadyLoggedIn = async (req, res, next) => {
  const userId = extractUserId(req);
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && !user.isBlocked) {
        return res.status(400).json({ success: false, message: 'Already logged in' });
      }
    } catch (error) {
      console.log("Middleware Error:", error);
    }
  }
  next();
};

export const isBlocked = async (req, res, next) => {
  const userId = extractUserId(req);
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && user.isBlocked) {
        return res.status(403).json({ success: false, message: 'Account blocked' });
      }
    } catch (error) {
      console.error(error);
    }
  }
  next();
};

export const noCache = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

export const userContext = async (req, res, next) => {
  try {
    const userId = extractUserId(req);
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
        const validProducts = wishlist.products.filter(item => item && item.productId);
        wishlistCount = validProducts.length;

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
    if (user) req.user = user;
    next();
  } catch (error) {
    console.error("User Context Middleware Error:", error);
    next();
  }
};

