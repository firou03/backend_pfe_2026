const Payment = require("../models/Payment");
const TransportRequest = require("../models/transportRequest.model");

// Calculate price based on weight
exports.calculatePrice = (weight) => {
  if (weight <= 10) {
    return 7; // 7 DT for up to 10 kg
  } else {
    return 7 + (weight - 10) * 1; // 7 DT base + 1 DT per kg above 10 kg
  }
};

// Get price for a request
exports.getPriceForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await TransportRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const amount = exports.calculatePrice(request.weight);

    res.json({
      weight: request.weight,
      amount,
      currency: "DT",
      description: `Transport de ${request.weight}kg - ${request.pickupLocation} → ${request.deliveryLocation}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const { requestId, cardNumber, holderName, paymentMethod = "card" } = req.body;
    
    const request = await TransportRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const amount = exports.calculatePrice(request.weight);
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payment = await Payment.create({
      transportRequest: requestId,
      transporteur: request.transporteur,
      client: request.client,
      weight: request.weight,
      amount,
      paymentMethod,
      transactionId,
      cardInfo: {
        cardNumber: cardNumber ? cardNumber.slice(-4) : null,
        holderName,
      },
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

// Confirm payment from client
exports.confirmPayment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { amount, paymentMethod, cardNumber, holderName } = req.body;

    // Find payment by transport request ID
    const payment = await Payment.findOne({ transportRequest: requestId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.amount !== amount) {
      return res.status(400).json({ message: "Amount mismatch" });
    }

    // Update payment status to completed
    payment.status = "completed";
    payment.paymentMethod = paymentMethod;
    if (paymentMethod === "card") {
      payment.cardInfo = {
        cardNumber: cardNumber || "****",
        holderName: holderName || "Client Payment",
      };
    }
    await payment.save();

    res.json({
      message: "Payment confirmed successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
