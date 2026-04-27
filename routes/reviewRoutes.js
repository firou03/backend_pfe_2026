var express = require("express");
var router = express.Router();
const reviewController = require("../controllers/reviewController");

// Create a review
router.post("/create", reviewController.createReview);

// Get reviews for a user
router.get("/user/:userId", reviewController.getUserReviews);

// Check if user can rate
router.get("/canRate", reviewController.canRate);

// Delete a review
router.delete("/:reviewId", reviewController.deleteReview);

module.exports = router;
