const mongoose = require("mongoose");
const {
  TRANSPORT_REQUEST_STATUS,
  TRANSPORT_REQUEST_STATUS_VALUES,
} = require("../constants/transportRequestStatus");

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
      enum: TRANSPORT_REQUEST_STATUS_VALUES,
      default: TRANSPORT_REQUEST_STATUS.PENDING,
    },
    transporterLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportRequest", transportRequestSchema);