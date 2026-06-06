const Payment = require("../models/Payment");
const TransportRequest = require("../models/transportRequest.model");
const {
  calculatePrice,
  createTransactionId,
  getBillableWeight,
} = require("../services/payment.service");

// Calculate price based on weight
exports.calculatePrice = calculatePrice;

// Get price for a request
exports.getPriceForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await TransportRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Ensure weight is a number
    const weight = getBillableWeight(request.weight);
    if (weight <= 0) {
      return res.status(400).json({ error: "Le poids du colis n'est pas défini" });
    }

    const amount = calculatePrice(weight);

    res.json({
      weight: weight,
      amount,
      currency: "DT",
      description: `Transport de ${weight}kg - ${request.pickupLocation} → ${request.deliveryLocation}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const { requestId, cardNumber, holderName, paymentMethod = "card" } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ error: "RequestId is required" });
    }

    const request = await TransportRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Validate weight (same as getPriceForRequest)
    const weight = getBillableWeight(request.weight);
    if (weight <= 0) {
      return res.status(400).json({ error: "Le poids du colis n'est pas défini" });
    }

    const amount = calculatePrice(weight);
    const transactionId = createTransactionId();

    const payment = await Payment.create({
      transportRequest: requestId,
      transporteur: request.transporteur,
      client: request.client,
      weight: weight,
      amount,
      paymentMethod,
      transactionId,
      cardInfo: paymentMethod === "card" ? {
        cardNumber: cardNumber ? cardNumber.slice(-4) : null,
        holderName,
      } : null,
      status: "completed", // In real system, this would be after 3D secure validation
    });

    // Update transport request with payment
    request.payment = payment._id;
    await request.save();

    res.status(201).json({
      message: "Payment processed successfully",
      payment: payment,
      transactionId: payment.transactionId,
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get payment details
exports.getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId)
      .populate("transportRequest", "pickupLocation deliveryLocation weight status")
      .populate("transporteur", "name email")
      .populate("client", "name email");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all payments for a user
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user._id;
    const payments = await Payment.find({
      $or: [{ transporteur: userId }, { client: userId }],
    })
      .populate("transportRequest", "pickupLocation deliveryLocation weight status")
      .populate("transporteur", "name email")
      .populate("client", "name email")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Confirm a pending payment from the client payments page
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to confirm this payment" });
    }

    payment.status = "completed";
    await payment.save();

    res.json({
      message: "Payment confirmed successfully",
      payment,
      transactionId: payment.transactionId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


