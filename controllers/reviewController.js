const Review = require("../models/Review");
const User = require("../models/user.model");

// Create a review
module.exports.createReview = async (req, res) => {
  try {
    const { ratedUserId, transportRequestId, rating, comment } = req.body;
    const ratedById = req.user?._id || req.body.ratedById;

    if (!ratedById || !ratedUserId || rating === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if user already rated this person for this request
    const existingReview = await Review.findOne({
      ratedBy: ratedById,
      ratedUser: ratedUserId,
      transportRequest: transportRequestId,
    });

    if (existingReview) {
      return res.status(400).json({ error: "You have already rated this user for this request" });
    }

    const newReview = new Review({
      ratedBy: ratedById,
      ratedUser: ratedUserId,
      transportRequest: transportRequestId,
      rating,
      comment: comment || "",
    });

    await newReview.save();

    // Update user's average rating
    const userReviews = await Review.find({ ratedUser: ratedUserId });
    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

    await User.findByIdAndUpdate(
      ratedUserId,
      {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: userReviews.length,
      },
      { new: true }
    );

    res.status(201).json({
      message: "Review created successfully",
      data: newReview,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get reviews for a user
module.exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ ratedUser: userId })
      .populate("ratedBy", "name email user_image role")
      .populate("transportRequest", "pickupLocation deliveryLocation")
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select("averageRating totalReviews");

    const starDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    res.status(200).json({
      average: user?.averageRating || 0,
      total: user?.totalReviews || 0,
      reviews,
      starDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Check if user can rate another user for a request
module.exports.canRate = async (req, res) => {
  try {
    const { userId, targetUserId, requestId } = req.query;

    const review = await Review.findOne({
      ratedBy: userId,
      ratedUser: targetUserId,
      transportRequest: requestId,
    });

    res.status(200).json({
      canRate: !review,
      alreadyRated: !!review,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a review (only by the rater or admin)
module.exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?._id || req.body.userId;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.ratedBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }

    await Review.findByIdAndDelete(reviewId);

    // Recalculate user's average rating
    const userReviews = await Review.find({ ratedUser: review.ratedUser });
    const avgRating = userReviews.length > 0 
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length 
      : 0;

    await User.findByIdAndUpdate(
      review.ratedUser,
      {
        averageRating: userReviews.length > 0 ? Math.round(avgRating * 10) / 10 : 0,
        totalReviews: userReviews.length,
      }
    );

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL (for Admin)
module.exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("ratedBy",   "name email user_image role")
      .populate("ratedUser", "name email user_image role")
      .populate("transportRequest", "pickupLocation deliveryLocation weight status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Toutes les évaluations récupérées",
      data: reviews,
      count: reviews.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
