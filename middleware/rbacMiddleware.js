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

/**
 * Ensures the logged-in vendor has verified KYC before creating/modifying resources
 * Super Admin (owner) bypasses this requirement.
 */
export const requireVerifiedKyc = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Authorization required" });
  }

  // Super Admin (owner) always passes
  if (req.admin.role === "owner") {
    return next();
  }

  if (req.admin.kycStatus !== "verified") {
    const isPending = req.admin.kycStatus === "pending";
    const statusMsg = isPending
      ? "Your KYC documents are currently under review by Super Admin. You will be able to add products once approved."
      : "Please upload your KYC documents and wait for Super Admin approval before adding products or coupons.";

    return res.status(403).json({
      success: false,
      requireKyc: true,
      kycStatus: req.admin.kycStatus,
      message: `KYC Verification Required. ${statusMsg}`
    });
  }

  next();
};
