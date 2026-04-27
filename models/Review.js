const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ratedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transportRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRequest",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
