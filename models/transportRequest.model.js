const mongoose = require("mongoose");

const transportRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transporteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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
    weight: {
      type: Number,
      default: 0,
    },
    isSensitive: {
      type: String,
      enum: ["oui", "non"],
      default: "non",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "delivered"],
      default: "pending",
    },
    transporterLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportRequest", transportRequestSchema);