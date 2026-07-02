/**
 * Middleware to enforce Role-Based Access Control (RBAC)
 * Must be used AFTER verifyAdminJWT
 */

/**
 * Ensures the logged-in admin is the Owner/Super Admin
 */
export const isOwner = (req, res, next) => {
  if (req.admin && req.admin.role === "owner") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Owner privileges required." });
  }
};

/**
 * Ensures the logged-in admin is at least an Admin/Vendor
 */
export const isAdminOrOwner = (req, res, next) => {
  if (req.admin && (req.admin.role === "admin" || req.admin.role === "vendor" || req.admin.role === "owner")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
};
