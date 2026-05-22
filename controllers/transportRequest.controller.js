const TransportRequest = require("../models/transportRequest.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const Payment = require("../models/Payment");

// CREATE
exports.createRequest = async (req, res) => {
  try {
    // Convert weight to number and validate
    const weight = parseInt(req.body.weight) || 0;
    if (weight <= 0) {
      return res.status(400).json({ message: "Le poids doit être supérieur à 0 kg" });
    }

    const request = await TransportRequest.create({
      ...req.body,
      weight: weight,
      client: req.user._id, // ✅ ID du client connecté
    });

    // 📢 Create notifications for all transporteurs
    try {
      const transporteurs = await User.find({ role: "transporteur" });
      await Promise.all(
        transporteurs.map((t) =>
          Notification.create({
            userId: t._id,
            type: "new_request",
            title: "Nouvelle demande disponible",
            message: `Nouvelle demande: ${request.pickupLocation} → ${request.deliveryLocation}, ${request.weight}kg.`,
            requestId: request._id,
          })
        )
      );
    } catch (notifError) {
      console.error("⚠️ Error creating notifications:", notifError);
    }

    res.status(201).json({
      message: "Request created successfully",
      request,
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
      .populate("client", "name email user_image phone location address city role averageRating totalReviews")
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ACCEPT REQUEST
exports.acceptRequest = async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.status !== "pending")
      return res.status(400).json({ message: "Already accepted" });

    request.status = "accepted_by_transporter";
    request.transporteur = req.user._id;
    request.acceptedAt = new Date();
    request.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
    await request.save();

    // Update payment with transporteur info (avoid full document re-validation)
    if (request.payment) {
      try {
        await Payment.findByIdAndUpdate(
          request.payment,
          { transporteur: req.user._id },
          { runValidators: false }
        );
      } catch (payErr) {
        console.error("⚠️ Payment update on accept:", payErr.message);
      }
    }

    const clientId = request.client?._id || request.client;

    // 📢 Create notification for the client
    try {
      await Notification.create({
        userId: clientId,
        type: "request_accepted",
        title: "Votre demande a été acceptée !",
        message: `Un transporteur a accepté votre demande ${request.pickupLocation} → ${request.deliveryLocation}. Vous avez 24h pour confirmer ou refuser.`,
        requestId: request._id,
      });
    } catch (notifError) {
      console.error("⚠️ Error creating notification:", notifError);
    }

    const populated = await TransportRequest.findById(request._id)
      .populate("client", "name email user_image phone location address city role averageRating totalReviews")
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews");

    res.json({
      message: "Request accepted successfully",
      request: populated,
    });
  } catch (error) {
    console.error("❌ acceptRequest error:", error);
    res.status(500).json({ message: error.message });
  }
};
// GET PENDING ONLY
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({ status: "pending" })
      .populate("client", "name email user_image phone location address city role averageRating totalReviews")
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
      status: { $in: ["accepted", "accepted_by_transporter", "confirmed", "delivered"] }
    })
      .populate("client", "name email user_image phone location address city role averageRating totalReviews")
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
      .populate("client", "name email user_image phone location address city role averageRating totalReviews")
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

    // Allow delivery from confirmed, accepted_by_transporter, or accepted status
    if (!["confirmed", "accepted_by_transporter", "accepted"].includes(request.status)) {
      return res.status(400).json({ message: "Status doit être confirmé ou accepté pour livrer" });
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

const CLIENT_CONFIRM_STATUSES = ["accepted_by_transporter", "accepted"];

function getRequestClientId(request) {
  const c = request.client;
  if (!c) return null;
  return (c._id || c).toString();
}

// CONFIRM TRANSPORT REQUEST (client confirms the transporter)
exports.confirmTransportRequest = async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const clientId = getRequestClientId(request);
    if (!clientId || clientId !== req.user._id.toString())
      return res.status(403).json({ message: "Only client can confirm" });

    if (request.status === "confirmed")
      return res.status(400).json({ message: "Cette demande est déjà confirmée." });

    if (!CLIENT_CONFIRM_STATUSES.includes(request.status))
      return res.status(400).json({
        message: `Impossible de confirmer (statut actuel : ${request.status}).`,
        currentStatus: request.status,
      });

    if (!request.transporteur)
      return res.status(400).json({ message: "Aucun transporteur assigné à cette demande." });

    request.status = "confirmed";
    request.confirmedAt = new Date();
    await request.save();

    // 📢 Create notification for the transporteur
    try {
      await Notification.create({
        userId: request.transporteur,
        type: "delivery_confirmed",
        title: "Livraison confirmée !",
        message: `Le client a confirmé la demande ${request.pickupLocation} → ${request.deliveryLocation}. Vous pouvez procéder à la livraison.`,
        requestId: request._id,
      });
    } catch (notifError) {
      console.error("⚠️ Error creating notification:", notifError);
    }

    res.json({
      message: "Request confirmed successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REFUSE TRANSPORT REQUEST (client refuses the transporter)
exports.refuseTransportRequest = async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const clientId = getRequestClientId(request);
    if (!clientId || clientId !== req.user._id.toString())
      return res.status(403).json({ message: "Only client can refuse" });

    if (!CLIENT_CONFIRM_STATUSES.includes(request.status))
      return res.status(400).json({
        message: `Impossible de refuser (statut actuel : ${request.status}).`,
        currentStatus: request.status,
      });

    const transporteurId = request.transporteur; // Store transporteur ID before clearing

    request.status = "cancelled";
    request.cancelledAt = new Date();
    request.transporteur = null; // Reset transporteur
    await request.save();

    // 📢 Create notification for the transporteur
    try {
      await Notification.create({
        userId: transporteurId,
        type: "request_cancelled",
        title: "Demande refusée",
        message: `Le client a refusé la demande ${request.pickupLocation} → ${request.deliveryLocation}.`,
        requestId: request._id,
      });
    } catch (notifError) {
      console.error("⚠️ Error creating notification:", notifError);
    }

    res.json({
      message: "Request refused successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET CLIENT REQUESTS (for client dashboard)
exports.getClientRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({ client: req.user._id })
      .populate("transporteur", "name email user_image phone location address city role averageRating totalReviews")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};