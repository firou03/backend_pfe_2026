const TransportRequest = require("../models/transportRequest.model");
const Payment = require("../models/Payment");
const User = require("../models/user.model");

// Calculate price based on weight
const calculatePrice = (weight) => {
  if (weight <= 10) {
    return 7; // 7 DT for up to 10 kg
  } else {
    return 7 + (weight - 10) * 1; // 7 DT base + 1 DT per kg above 10 kg
  }
};

// CREATE
exports.createRequest = async (req, res) => {
  try {
    const request = await TransportRequest.create({
      ...req.body,
      client: req.user._id, // ✅ ID du client connecté
    });

    // Auto-create payment invoice for the client
    const amount = calculatePrice(req.body.weight);
    const transactionId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payment = await Payment.create({
      transportRequest: request._id,
      client: req.user._id,
      transporteur: null, // Will be filled when transporteur accepts
      weight: req.body.weight,
      amount,
      paymentMethod: "pending",
      transactionId,
      status: "pending",
    });

    request.payment = payment._id;
    await request.save();

    res.status(201).json({
      request,
      payment,
    });
  } catch (error) {
    console.error("❌ Error creating request:", error);
    res.status(500).json({ 
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.toString() : "Request creation failed"
    });
  }
};

// GET ALL
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find()
      .populate("client", "name email user_image phone location address city role")
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ACCEPT REQUEST
exports.acceptRequest = async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id).populate("payment");

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.status !== "pending")
      return res.status(400).json({ message: "Already accepted" });

    request.status = "accepted";
    request.transporteur = req.user._id;
    await request.save();

    // Update payment with transporteur info if exists
    if (request.payment) {
      request.payment.transporteur = req.user._id;
      await request.payment.save();
    }

    res.json({
      message: "Request accepted successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET PENDING ONLY
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({ status: "pending" })
      .populate("client", "name email user_image phone location address city role")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET MES REQUESTS (transporteur connecté)
exports.getMesRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({
      transporteur: req.user._id,
      status: { $in: ["accepted", "delivered"] }
    })
      .populate("client", "name email user_image phone location address city role")
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews")
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET MY REQUESTS (client connecté)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({
      client: req.user._id,
    })
      .populate("client", "name email user_image phone location address city role")
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE LOCATION (transporteur connecté)
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, latitude, longitude } = req.body;

    const parsedLat = Number(lat ?? latitude);
    const parsedLng = Number(lng ?? longitude);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({
        message:
          "Invalid location payload. Provide numeric lat/lng or latitude/longitude.",
      });
    }

    const request = await TransportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (
      request.transporteur &&
      request.transporteur.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!request.transporteur) {
      request.transporteur = req.user._id;
    }

    request.transporterLocation = {
      lat: parsedLat,
      lng: parsedLng,
      updatedAt: new Date(),
    };

    await request.save();

    res.json({
      message: "Location updated",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELIVER — marks delivered, completes payment, credits transporteur + admin revenue
exports.deliverRequest = async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id).populate("payment");

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.status === "delivered")
      return res.status(400).json({ message: "Déjà livré" });

    // Only the assigned transporteur can deliver
    if (
      request.transporteur &&
      request.transporteur.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    // ── 1. Mark request as delivered ──────────────────────────────────────
    request.status = "delivered";
    await request.save();

    // ── 2. Determine the amount to credit ────────────────────────────────
    let amount = 0;
    let payment = null;

    if (request.payment) {
      // Use the linked Payment document
      payment = await Payment.findById(
        request.payment._id || request.payment
      );
    }

    if (!payment) {
      // Fallback: find by transportRequest
      payment = await Payment.findOne({ transportRequest: request._id });
    }

    if (payment) {
      amount = payment.amount || 0;

      // Mark payment completed if still pending
      if (payment.status !== "completed") {
        payment.status = "completed";
        payment.paymentMethod =
          payment.paymentMethod === "pending" ? "cash" : payment.paymentMethod;
        // Ensure transporteur is linked
        if (!payment.transporteur && request.transporteur) {
          payment.transporteur = request.transporteur;
        }
        await payment.save();
      }
    } else {
      // No payment record — calculate from weight
      const calculatePrice = (w) => (w <= 10 ? 7 : 7 + (w - 10));
      amount = calculatePrice(request.weight || 0);
    }

    // ── 3. Credit transporteur's totalRevenue ─────────────────────────────
    if (request.transporteur && amount > 0) {
      await User.findByIdAndUpdate(
        request.transporteur,
        { $inc: { totalRevenue: amount } },
        { new: true }
      );
    }

    // ── 4. Credit admin's totalRevenue ────────────────────────────────────
    if (amount > 0) {
      await User.updateMany(
        { role: "admin" },
        { $inc: { totalRevenue: amount } }
      );
    }

    res.json({
      message: "Livraison confirmée. Paiement crédité.",
      request,
      payment,
      amountCredited: amount,
    });
  } catch (error) {
    console.error("❌ deliverRequest error:", error);
    res.status(500).json({ message: error.message });
  }
};