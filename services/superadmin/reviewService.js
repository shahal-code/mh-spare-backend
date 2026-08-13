import Review from "../../models/reviewModel.js";
import { deleteCache } from "../../utils/cacheHelper.js";
import { CACHE_KEYS } from "../../utils/cacheKeys.js";

export const getReviews = async (page = 1, limit = 10, search = "", statusFilter = "", ratingFilter = "") => {
  const skip = (page - 1) * limit;

  const query = {};
  if (statusFilter === "hidden") {
    query.status = "hidden";
  } else if (statusFilter === "visible") {
    query.$or = [{ status: "visible" }, { status: { $exists: false } }];
  }

  if (ratingFilter) {
    query.rating = Number(ratingFilter);
  }

  // Calculate overall metrics
  const [totalCount, visibleCount, hiddenCount, avgRatingResult] = await Promise.all([
    Review.countDocuments({}),
    Review.countDocuments({ $or: [{ status: "visible" }, { status: { $exists: false } }] }),
    Review.countDocuments({ status: "hidden" }),
    Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ])
  ]);

  const averageRating = avgRatingResult[0]?.avgRating ? Number(avgRatingResult[0].avgRating.toFixed(1)) : 0;

  const reviews = await Review.find(query)
    .populate("user", "fullname email phone")
    .populate("product", "name images thumbnail price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments(query);

  // Filter in memory if search exists (since we populate user and product)
  let filteredReviews = reviews;
  if (search) {
    const lowerSearch = search.toLowerCase();
    filteredReviews = reviews.filter(r => 
      (r.user && (r.user.fullname?.toLowerCase().includes(lowerSearch) || r.user.email?.toLowerCase().includes(lowerSearch))) ||
      (r.product && r.product.name?.toLowerCase().includes(lowerSearch)) ||
      (r.comment && r.comment.toLowerCase().includes(lowerSearch))
    );
  }

  return {
    reviews: filteredReviews,
    stats: {
      total: totalCount,
      visible: visibleCount,
      hidden: hiddenCount,
      averageRating
    },
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
};

export const toggleReviewStatus = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error("Review not found");

  review.status = review.status === "hidden" ? "visible" : "hidden";
  await review.save();

  // Invalidate public caches for this product and landing page
  if (review.product) {
    const prodId = review.product.toString();
    await deleteCache(CACHE_KEYS.PRODUCT_REVIEWS(prodId));
    await deleteCache(CACHE_KEYS.PRODUCT_DETAIL(prodId));
  }
  await deleteCache(CACHE_KEYS.LANDING_PRODUCTS);

  return review;
};

export const deleteReview = async (reviewId) => {
  const review = await Review.findByIdAndDelete(reviewId);
  if (!review) throw new Error("Review not found");

  // Invalidate public caches for this product and landing page
  if (review.product) {
    const prodId = review.product.toString();
    await deleteCache(CACHE_KEYS.PRODUCT_REVIEWS(prodId));
    await deleteCache(CACHE_KEYS.PRODUCT_DETAIL(prodId));
  }
  await deleteCache(CACHE_KEYS.LANDING_PRODUCTS);

  return review;
};
