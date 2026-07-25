import Offer from "../../models/offerModel.js";

const adminOfferFilter = { offerType: { $in: ["product", "category"] } };

class OfferService {
    /**
     * Calculate the discount amount for a given total and offer
     */
    calculateDiscount(offer, total) {
        if (!offer || !offer.isActive) return 0;
        
        const now = new Date();
        if (now < offer.startDate || now > offer.endDate) {
            return 0;
        }

        let discount = 0;
        if (offer.discountType === 'percentage') {
            discount = (total * offer.discountValue) / 100;
            if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
                discount = offer.maxDiscountAmount;
            }
        } else if (offer.discountType === 'flat') {
            discount = offer.discountValue;
        }
        
        return discount;
    }

    /**
     * Get the best applicable offer for a product and its category
     * Evaluates all active offers and returns the one providing the maximum discount value
     */
    async getBestOfferForProduct(productId, categoryId, price) {
        const now = new Date();
        
        // Find active offers applicable to this product or its category
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { applicableModel: 'Product', applicableTo: productId },
                { applicableModel: 'Category', applicableTo: categoryId }
            ]
        });

        if (!activeOffers || activeOffers.length === 0) {
            return null;
        }

        let bestOffer = null;
        let maxDiscountAmount = 0;

        for (const offer of activeOffers) {
            const discountAmount = this.calculateDiscount(offer, price);
            if (discountAmount > maxDiscountAmount) {
                maxDiscountAmount = discountAmount;
                bestOffer = offer;
            }
        }

        return {
            offer: bestOffer,
            discountAmount: maxDiscountAmount
        };
    }

    /**
     * Validates a referral code against business rules
     */
    async validateReferralCode(code, userId) {
        if (!code) {
            throw new Error("Please enter a referral code.");
        }

        const now = new Date();
        const offer = await Offer.findOne({ 
            referralCode: code.toUpperCase(), 
            offerType: 'referral',
            isActive: true 
        });
        
        if (!offer) {
            throw new Error("Invalid referral code.");
        }

        if (now < offer.startDate || now > offer.endDate) {
            throw new Error("This referral code is expired or not active yet.");
        }

        if (offer.maxUses !== null && offer.usedCount >= offer.maxUses) {
            throw new Error("This referral code has reached its maximum usage limit.");
        }

        if (offer.usedBy.includes(userId)) {
            throw new Error("You have already used this referral code.");
        }

        return offer;
    }

    /**
     * Mark an offer as used (increments usage count and adds user)
     */
    async markOfferAsUsed(offerId, userId) {
        if (!offerId || !userId) return;
        await Offer.updateOne(
            { _id: offerId },
            { 
                $inc: { usedCount: 1 },
                $push: { usedBy: userId }
            }
        );
    }

    /**
     * Get statistics for admin-managed product and category offers
     */
    async getOfferStats() {
        const totalOffers = await Offer.countDocuments(adminOfferFilter);
        const activeOffers = await Offer.countDocuments({ 
            ...adminOfferFilter,
            isActive: true, 
            endDate: { $gte: new Date() } 
        });
        const expiredOffers = await Offer.countDocuments({
            ...adminOfferFilter,
            $or: [
                { isActive: false },
                { endDate: { $lt: new Date() } }
            ]
        });
        return { totalOffers, activeOffers, expiredOffers };
    }
}

export default new OfferService();
