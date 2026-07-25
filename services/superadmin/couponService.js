import Coupon from "../../models/couponModel.js";

class CouponService {
    /**
     * Get statistics for all coupons
     */
    async getCouponStats() {
        const now = new Date();
        const totalCoupons = await Coupon.countDocuments();
        const activeCoupons = await Coupon.countDocuments({ isActive: true, expirationDate: { $gte: now } });
        const expiredCoupons = await Coupon.countDocuments({ 
            $or: [
                { isActive: false }, 
                { expirationDate: { $lt: now } }
            ] 
        });

        return { totalCoupons, activeCoupons, expiredCoupons };
    }
}

export default new CouponService();
