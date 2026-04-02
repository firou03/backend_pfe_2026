const mongoose = require("mongoose");

const transportRequestSchema = new mongoose.Schema(
  {
    pickupLocation: {
      type: String,
      required: true,
    },
    deliveryLocation: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed"],
      default: "pending",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transporteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportRequest", transportRequestSchema);