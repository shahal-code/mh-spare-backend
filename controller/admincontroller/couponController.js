import Coupon from "../../models/couponModel.js";
import CouponService from "../../services/admin/couponService.js";

/**
 * Load Coupons Page
 */
export const loadCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        const { totalCoupons, activeCoupons, expiredCoupons } = await CouponService.getCouponStats();

        res.render("admin/coupons/coupons", { coupons, totalCoupons, activeCoupons, expiredCoupons, activePage: "coupons" });
    } catch (error) {
        console.error("Load Coupons Error:", error);
        res.status(500).send("Server Error");
    }
};

/**
 * Render Add Coupon Page
 */
export const getAddCouponPage = (req, res) => {
    res.render("admin/coupons/add-coupon", { activePage: "coupons" });
};

/**
 * Render Edit Coupon Page
 */
export const getEditCouponPage = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.redirect('/admin/coupons');
        res.render("admin/coupons/edit-coupon", { coupon, activePage: "coupons" });
    } catch (error) {
        console.error("Edit Coupon Page Error:", error);
        res.redirect('/admin/coupons');
    }
};

/**
 * Create Coupon
 */
export const createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = req.body;

        if (!code || !discountType || !discountValue || !expirationDate) {
            return res.status(400).json({ success: false, message: "All required fields must be filled." });
        }

        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: "A coupon with this code already exists." });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minPurchaseAmount: minPurchaseAmount || 0,
            maxDiscountAmount: maxDiscountAmount || null,
            expirationDate: new Date(expirationDate),
            isActive: true
        });

        await coupon.save();
        res.json({ success: true, message: "Coupon created successfully!" });
    } catch (error) {
        console.error("Create Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to create coupon." });
    }
};

/**
 * Update Coupon
 */
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, expirationDate } = req.body;

        if (!code || !discountType || !discountValue || !expirationDate) {
            return res.status(400).json({ success: false, message: "All required fields must be filled." });
        }

        // Check if another coupon already uses this code
        const existing = await Coupon.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Another coupon with this code already exists." });
        }

        await Coupon.findByIdAndUpdate(id, {
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minPurchaseAmount: minPurchaseAmount || 0,
            maxDiscountAmount: maxDiscountAmount || null,
            expirationDate: new Date(expirationDate)
        });

        res.json({ success: true, message: "Coupon updated successfully!" });
    } catch (error) {
        console.error("Update Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to update coupon." });
    }
};

/**
 * Toggle Coupon Active Status
 */
export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully.` });
    } catch (error) {
        console.error("Toggle Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to update coupon status." });
    }
};

/**
 * Delete Coupon
 */
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
        res.json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
        console.error("Delete Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete coupon." });
    }
};
