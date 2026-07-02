
import Offer from "../../models/offerModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import OfferService from "../../services/admin/offerService.js";

const ADMIN_OFFER_TYPES = ["product", "category"];

/**
 * Load Offers Page
 */
export const loadOffers = async (req, res) => {
    try {
        const offers = await Offer.find({ offerType: { $in: ADMIN_OFFER_TYPES } }).sort({ createdAt: -1 });

        // Count statistics from service
        const { totalOffers, activeOffers, expiredOffers } = await OfferService.getOfferStats();

        res.render("admin/offers/offers", { offers, totalOffers, activeOffers, expiredOffers, activePage: "offers" });
    } catch (error) {
        console.error("Load Offers Error:", error);
        res.status(500).send("Server Error");
    }
};

/**
 * Render Add Offer Page
 */
export const getAddOfferPage = async (req, res) => {
    try {
        const products = await Product.find({ is_unlisted: false, is_blocked: false }).select('name _id');
        const categories = await Category.find({ is_blocked: false }).select('name _id');
        res.render("admin/offers/add-offer", { products, categories, activePage: "offers" });
    } catch (error) {
        console.error("Load Add Offer Page Error:", error);
        res.status(500).send("Server Error");
    }
};

/**
 * Render Edit Offer Page
 */
export const getEditOfferPage = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.redirect('/admin/offers');
        if (!ADMIN_OFFER_TYPES.includes(offer.offerType)) return res.redirect('/admin/offers');

        const products = await Product.find({ is_unlisted: false, is_blocked: false }).select('name _id');
        const categories = await Category.find({ is_blocked: false }).select('name _id');

        res.render("admin/offers/edit-offer", { offer, products, categories, activePage: "offers" });
    } catch (error) {
        console.error("Edit Offer Page Error:", error);
        res.redirect('/admin/offers');
    }
};

/**
 * Create Offer
 */
export const createOffer = async (req, res) => {
    try {
        const { name, description, offerType, discountType, discountValue, maxDiscountAmount, applicableTo, startDate, endDate } = req.body;

        if (!name || !offerType || !discountType || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Required fields are missing." });
        }

        if (!ADMIN_OFFER_TYPES.includes(offerType)) {
            return res.status(400).json({ success: false, message: "Only product and category offers can be managed from admin." });
        }

        if (!applicableTo) {
            return res.status(400).json({ success: false, message: "Please select an applicable item." });
        }

        const offerData = {
            name,
            description,
            offerType,
            discountType,
            discountValue,
            maxDiscountAmount: maxDiscountAmount || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true
        };

        if (offerType === 'product') {
            offerData.applicableTo = applicableTo;
            offerData.applicableModel = 'Product';
        } else if (offerType === 'category') {
            offerData.applicableTo = applicableTo;
            offerData.applicableModel = 'Category';
        }

        const offer = new Offer(offerData);
        await offer.save();

        res.json({ success: true, message: "Offer created successfully!" });
    } catch (error) {
        console.error("Create Offer Error:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(400).json({ success: false, message: `A duplicate value was detected (${field}). Please use a unique offer name.` });
        }
        res.status(500).json({ success: false, message: "Failed to create offer." });
    }
};

/**
 * Update Offer
 */
export const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, discountType, discountValue, maxDiscountAmount, applicableTo, startDate, endDate } = req.body;

        if (!name || !discountType || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Required fields are missing." });
        }

        const existingOffer = await Offer.findById(id).select("offerType");
        if (!existingOffer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }

        const offerType = existingOffer.offerType;
        if (!ADMIN_OFFER_TYPES.includes(offerType)) {
            return res.status(400).json({ success: false, message: "Referral offers cannot be managed from admin." });
        }

        if (!applicableTo) {
            return res.status(400).json({ success: false, message: "Please select an applicable item." });
        }

        const offerData = {
            name,
            description,
            discountType,
            discountValue,
            maxDiscountAmount: maxDiscountAmount || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        };

        if (offerType === 'product') {
            offerData.applicableTo = applicableTo;
            offerData.applicableModel = 'Product';
        } else if (offerType === 'category') {
            offerData.applicableTo = applicableTo;
            offerData.applicableModel = 'Category';
        }

        await Offer.findByIdAndUpdate(id, offerData);

        res.json({ success: true, message: "Offer updated successfully!" });
    } catch (error) {
        console.error("Update Offer Error:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(400).json({ success: false, message: `A duplicate value was detected (${field}). Please use a unique offer name.` });
        }
        res.status(500).json({ success: false, message: "Failed to update offer." });
    }
};

/**
 * Toggle Offer Active Status
 */
export const toggleOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        if (!ADMIN_OFFER_TYPES.includes(offer.offerType)) {
            return res.status(400).json({ success: false, message: "Referral offers cannot be managed from admin." });
        }
        offer.isActive = !offer.isActive;
        await offer.save();
        res.json({ success: true, message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully.` });
    } catch (error) {
        console.error("Toggle Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to update offer status." });
    }
};

/**
 * Delete Offer
 */
export const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id).select("offerType");
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        if (!ADMIN_OFFER_TYPES.includes(offer.offerType)) {
            return res.status(400).json({ success: false, message: "Referral offers cannot be managed from admin." });
        }

        await Offer.findByIdAndDelete(id);
        res.json({ success: true, message: "Offer deleted successfully." });
    } catch (error) {
        console.error("Delete Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete offer." });
    }
};
