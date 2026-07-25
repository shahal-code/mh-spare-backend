import * as reviewService from "../../services/superadmin/reviewService.js";

export const getReviews = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;
    const data = await reviewService.getReviews(page, limit, search, status);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await reviewService.toggleReviewStatus(id);
    res.status(200).json({ success: true, message: "Review status updated", review });
  } catch (error) {
    next(error);
  }
};

export const removeReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    await reviewService.deleteReview(id);
    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};
