const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middlewares/authMiddleware");

// Calculate price for a request
router.get("/price/:requestId", paymentController.getPriceForRequest);

// Get payment details
router.get("/:paymentId", paymentController.getPayment);

// Get user payments
router.get("/user/payments", authMiddleware, paymentController.getUserPayments);

// Confirm payment from client
router.post("/confirm/:requestId", authMiddleware, paymentController.confirmPayment);

module.exports = router;
