import Review from "../../models/reviewModel.js";
import Product from "../../models/productModel.js";

export const addReview = async (req, res) => {
    try {
        const { id: productId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.session.user; // Assuming userAuth sets req.session.user

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to submit a review." });
        }

        if (!rating || !comment) {
            return res.status(400).json({ success: false, message: "Rating and comment are required." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed this product." });
        }

        const review = new Review({
            user: userId,
            product: productId,
            rating: Number(rating),
            comment: comment.trim()
        });

        await review.save();

        res.status(201).json({ success: true, message: "Review added successfully.", review });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ success: false, message: "An error occurred while submitting the review." });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id: productId, reviewId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to delete a review." });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }

        if (String(review.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this review." });
        }

        await Review.findByIdAndDelete(reviewId);
        res.status(200).json({ success: true, message: "Review deleted successfully." });
    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({ success: false, message: "An error occurred while deleting the review." });
    }
};
