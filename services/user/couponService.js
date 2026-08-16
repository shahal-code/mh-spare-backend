import Coupon from "../../models/couponModel.js";
import Cart from "../../models/cartModel.js";
import { applyOffers } from "./productServices.js";
import { calculateItemUnitPrice } from "./cartService.js";

class CouponService {
    /**
     * Calculate the eligible items, subtotal, and total for a coupon in a given cart.
     * Super Admin coupons apply to ALL vendors' products.
     * Vendor coupons apply ONLY to that specific vendor's products.
     */
    getEligibleCartDetails(coupon, cart) {
        if (!cart || !cart.items || cart.items.length === 0) {
            return { eligibleSubtotal: 0, eligibleTax: 0, eligibleTotal: 0, itemCount: 0, eligibleItems: [] };
        }

        const isVendorCoupon = coupon.creatorRole === 'vendor' && coupon.createdBy;
        const targetVendorId = isVendorCoupon
            ? (coupon.createdBy._id ? coupon.createdBy._id.toString() : coupon.createdBy.toString())
            : null;

        let eligibleSubtotal = 0;
        const eligibleItems = [];

        cart.items.forEach(item => {
            const product = item.productId;
            const category = product?.category_id;
            if (!product || product.is_blocked || (category && category.is_blocked)) return;

            if (isVendorCoupon) {
                const itemVendorId = product.adminId
                    ? (product.adminId._id ? product.adminId._id.toString() : product.adminId.toString())
                    : null;
                if (!itemVendorId || itemVendorId !== targetVendorId) {
                    return; // Skip items from other vendors
                }
            }

            const variant = product.variants?.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
                const unitPrice = calculateItemUnitPrice(product, variant, item.quantity);
                eligibleSubtotal += unitPrice * item.quantity;
                eligibleItems.push({
                    ...item.toObject ? item.toObject() : item,
                    unitPrice,
                    itemTotal: unitPrice * item.quantity
                });
            }
        });

        const eligibleTax = eligibleSubtotal * 0.18;
        const eligibleTotal = eligibleSubtotal + eligibleTax;

        return {
            eligibleSubtotal,
            eligibleTax,
            eligibleTotal,
            itemCount: eligibleItems.length,
            eligibleItems
        };
    }

    /**
     * Calculate the discount amount for a given total and eligibleTotal
     */
    calculateDiscount(coupon, total, eligibleTotal = null) {
        if (!coupon) return 0;
        const baseAmount = eligibleTotal !== null && eligibleTotal !== undefined ? Number(eligibleTotal) : Number(total);
        
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (baseAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountValue;
        }
        
        if (discount > baseAmount) discount = baseAmount;
        if (discount > total) discount = total;
        return discount;
    }

    /**
     * Compute the cart total (+ tax) server-side for a given user.
     */
    async getServerCartTotal(userId) {
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: [
                { path: 'category_id' },
                { path: 'adminId', select: 'fullname storeDetails role' }
            ]
        });

        if (!cart || cart.items.length === 0) return 0;

        const productsToApply = cart.items.map(i => i.productId).filter(Boolean);
        if (productsToApply.length > 0) {
            await applyOffers(productsToApply);
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            const product = item.productId;
            const category = product?.category_id;
            if (!product || product.is_blocked || (category && category.is_blocked)) return;

            const variant = product.variants?.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
                const unitPrice = calculateItemUnitPrice(product, variant, item.quantity);
                subtotal += unitPrice * item.quantity;
            }
        });

        const tax = subtotal * 0.18;
        return subtotal + tax; // total with tax
    }

    /**
     * Validates a coupon code against business and vendor scoping rules.
     */
    async validateCoupon(code, userId, cartOrTotal) {
        if (!code) {
            throw new Error("Please enter a coupon code.");
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })
            .populate('createdBy', 'fullname storeDetails role');

        if (!coupon) {
            throw new Error("Coupon is not available.");
        }

        if (new Date() > coupon.expirationDate) {
            throw new Error("This coupon has expired.");
        }

        const alreadyUsed = (coupon.usedBy || []).some(
            usedUserId => usedUserId.toString() === userId.toString()
        );
        if (alreadyUsed) {
            throw new Error("You have already used this coupon.");
        }

        // Vendor-scoped cart verification
        let eligibleTotal = 0;
        if (cartOrTotal && typeof cartOrTotal === 'object' && cartOrTotal.items) {
            const details = this.getEligibleCartDetails(coupon, cartOrTotal);
            eligibleTotal = details.eligibleTotal;

            if (coupon.creatorRole === 'vendor') {
                const vendorName = coupon.createdBy?.storeDetails?.storeName || coupon.createdBy?.fullname || 'this vendor';
                if (details.itemCount === 0) {
                    throw new Error(`Coupon "${coupon.code}" is only valid on products from ${vendorName}.`);
                }
                if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                    throw new Error(`Minimum purchase of ₹${coupon.minPurchaseAmount} of ${vendorName}'s products required.`);
                }
            } else {
                if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                    throw new Error(`Minimum purchase of ₹${coupon.minPurchaseAmount} required.`);
                }
            }
        } else {
            eligibleTotal = Number(cartOrTotal) || 0;
            if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                throw new Error(`Minimum purchase of ₹${coupon.minPurchaseAmount} required.`);
            }
        }

        coupon.eligibleTotal = eligibleTotal;
        return coupon;
    }

    /**
     * Re-validate an already-applied coupon at order-placement time.
     */
    async reValidateCoupon(appliedCoupon, userId, cartOrTotal) {
        if (!appliedCoupon) return null;

        const coupon = await Coupon.findOne({ _id: appliedCoupon._id, isActive: true })
            .populate('createdBy', 'fullname storeDetails role');

        if (!coupon) {
            throw new Error("The applied coupon is no longer valid. Please remove it and try again.");
        }

        if (new Date() > coupon.expirationDate) {
            throw new Error("The applied coupon has expired. Please remove it and try again.");
        }

        const alreadyUsed = (coupon.usedBy || []).some(
            usedUserId => usedUserId.toString() === userId.toString()
        );
        if (alreadyUsed) {
            throw new Error("This coupon has already been used.");
        }

        let eligibleTotal = 0;
        if (cartOrTotal && typeof cartOrTotal === 'object' && cartOrTotal.items) {
            const details = this.getEligibleCartDetails(coupon, cartOrTotal);
            eligibleTotal = details.eligibleTotal;

            if (coupon.creatorRole === 'vendor') {
                const vendorName = coupon.createdBy?.storeDetails?.storeName || coupon.createdBy?.fullname || 'this vendor';
                if (details.itemCount === 0) {
                    throw new Error(`Coupon "${coupon.code}" is only valid on products from ${vendorName}.`);
                }
                if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                    throw new Error(`Your order no longer meets the minimum ₹${coupon.minPurchaseAmount} required for ${vendorName}'s products.`);
                }
            } else {
                if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                    throw new Error(`Your cart total (₹${eligibleTotal.toFixed(2)}) no longer meets the minimum purchase of ₹${coupon.minPurchaseAmount} required for coupon "${coupon.code}".`);
                }
            }
        } else {
            eligibleTotal = Number(cartOrTotal) || 0;
            if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                throw new Error(`Your cart total no longer meets the minimum required for coupon "${coupon.code}".`);
            }
        }

        coupon.eligibleTotal = eligibleTotal;
        return coupon;
    }

    /**
     * Get all active coupons applicable to the current user and cart with vendor scoping
     */
    async getApplicableCoupons(userId, cartOrTotal) {
        const now = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            expirationDate: { $gt: now }
        }).populate('createdBy', 'fullname storeDetails role').sort({ createdAt: -1 }).lean();

        const isCartObj = cartOrTotal && typeof cartOrTotal === 'object' && cartOrTotal.items;
        const total = isCartObj ? 0 : (Number(cartOrTotal) || 0);

        return coupons.map(coupon => {
            const alreadyUsed = (coupon.usedBy || []).some(
                usedUserId => usedUserId.toString() === userId.toString()
            );

            let isEligible = !alreadyUsed;
            let ineligibleReason = "";
            let eligibleTotal = 0;

            const creatorRole = coupon.creatorRole || (coupon.createdBy?.role === 'vendor' ? 'vendor' : 'superadmin');
            const creatorName = coupon.createdBy?.storeDetails?.storeName || coupon.createdBy?.fullname || (creatorRole === 'vendor' ? 'Vendor Store' : 'Super Admin');

            if (isCartObj) {
                const details = this.getEligibleCartDetails(coupon, cartOrTotal);
                eligibleTotal = details.eligibleTotal;

                if (creatorRole === 'vendor') {
                    // Do NOT display other vendors' coupons if their products are not in the cart
                    if (details.itemCount === 0) {
                        return null;
                    }
                    if (alreadyUsed) {
                        isEligible = false;
                        ineligibleReason = "Already used";
                    } else if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                        isEligible = false;
                        ineligibleReason = `Min order ₹${coupon.minPurchaseAmount} of ${creatorName}'s products required`;
                    }
                } else {
                    if (alreadyUsed) {
                        isEligible = false;
                        ineligibleReason = "Already used";
                    } else if (eligibleTotal < (coupon.minPurchaseAmount || 0)) {
                        isEligible = false;
                        ineligibleReason = `Min order ₹${coupon.minPurchaseAmount} required`;
                    }
                }
            } else {
                if (alreadyUsed) {
                    isEligible = false;
                    ineligibleReason = "Already used";
                } else if (total < (coupon.minPurchaseAmount || 0)) {
                    isEligible = false;
                    ineligibleReason = `Min order ₹${coupon.minPurchaseAmount} required`;
                }
            }

            return {
                _id: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minPurchaseAmount: coupon.minPurchaseAmount || 0,
                maxDiscountAmount: coupon.maxDiscountAmount || null,
                expirationDate: coupon.expirationDate,
                applicableOnBulk: coupon.applicableOnBulk ?? true,
                creatorRole,
                creatorName,
                alreadyUsed,
                isEligible,
                ineligibleReason
            };
        }).filter(Boolean);
    }

    /**
     * Mark a coupon as used by a specific user
     */
    async markCouponAsUsed(couponId, userId) {
        if (!couponId || !userId) return;
        await Coupon.updateOne(
            { _id: couponId },
            { $addToSet: { usedBy: userId } }
        );
    }
}

export default new CouponService();
