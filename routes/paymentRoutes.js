const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middlewares/authMiddleware");

// Calculate price for a request
router.get("/price/:requestId", paymentController.getPriceForRequest);

// Create payment
router.post("/create", authMiddleware, paymentController.createPayment);

// Confirm pending payment
router.post("/confirm/:paymentId", authMiddleware, paymentController.confirmPayment);

// Get payment details
router.get("/:paymentId", paymentController.getPayment);

// Get user payments
router.get("/user/payments", authMiddleware, paymentController.getUserPayments);

module.exports = router;
