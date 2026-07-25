import Review from "../../models/reviewModel.js";

export const getReviews = async (page = 1, limit = 10, search = "", statusFilter = "") => {
  const skip = (page - 1) * limit;

  const query = {};
  if (statusFilter) {
    query.status = statusFilter;
  }

  // To search by user name or product name, we would need to aggregate, but for now we'll do simple find and populate
  const reviews = await Review.find(query)
    .populate("user", "fullname email")
    .populate("product", "name images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments(query);

  // Filter in memory if search exists (since we populate)
  let filteredReviews = reviews;
  if (search) {
    const lowerSearch = search.toLowerCase();
    filteredReviews = reviews.filter(r => 
      (r.user && r.user.fullname.toLowerCase().includes(lowerSearch)) ||
      (r.product && r.product.name.toLowerCase().includes(lowerSearch)) ||
      r.comment.toLowerCase().includes(lowerSearch)
    );
  }

  return {
    reviews: filteredReviews,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
};

export const toggleReviewStatus = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error("Review not found");

  review.status = review.status === "hidden" ? "visible" : "hidden";
  await review.save();
  return review;
};

export const deleteReview = async (reviewId) => {
  const review = await Review.findByIdAndDelete(reviewId);
  if (!review) throw new Error("Review not found");
  return review;
};
