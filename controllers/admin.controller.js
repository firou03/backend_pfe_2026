const TransportRequest = require("../models/transportRequest.model");
const Payment = require("../models/Payment");
const User = require("../models/user.model");
const {
  LEGACY_ACCEPTED_STATUS,
  TRANSPORT_REQUEST_STATUS,
} = require("../constants/transportRequestStatus");
const { enrichWithPrice } = require("../services/payment.service");

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // ── Requests ──────────────────────────────────────────────────────────
    const allRequests = await TransportRequest.find()
      .populate("client",      "name email role")
      .populate("transporteur","name email role")
      .sort({ createdAt: -1 });

    const totalRequests     = allRequests.length;
    const pendingRequests   = allRequests.filter(r => r.status === TRANSPORT_REQUEST_STATUS.PENDING).length;
    const acceptedRequests  = allRequests.filter(r =>
      [LEGACY_ACCEPTED_STATUS, TRANSPORT_REQUEST_STATUS.ACCEPTED_BY_TRANSPORTER].includes(r.status)
    ).length;
    const deliveredRequests = allRequests.filter(r => r.status === TRANSPORT_REQUEST_STATUS.DELIVERED).length;
    const cancelledRequests = allRequests.filter(r => r.status === TRANSPORT_REQUEST_STATUS.CANCELLED).length;

    // ── Revenue: sum of all transporteurs' totalRevenue ──────────────────
    const transporteurs = await User.find({ role: "transporteur" });
    const totalRevenue = transporteurs.reduce(
      (sum, t) => sum + (t.totalRevenue || 0),
      0
    );

    // ── Admin's own totalRevenue (from User model) ────────────────────────
    const adminUser = await User.findOne({ role: "admin" });
    const adminRevenue = adminUser ? (adminUser.totalRevenue || 0) : 0;

    // ── Weekly requests (last 7 days) ─────────────────────────────────────
    const now = new Date();
    const weeklyRequests = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd   = new Date(day.setHours(23, 59, 59, 999));
      const count = allRequests.filter(r => {
        const d = new Date(r.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;
      weeklyRequests.push({
        day: dayStart.toLocaleDateString("fr-FR", { weekday: "short" }),
        date: dayStart.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json({
      message: "Dashboard stats retrieved successfully",
      data: {
        totalRequests,
        pendingRequests,
        acceptedRequests,
        deliveredRequests,
        cancelledRequests,
        totalRevenue,        // from completed Payments
        adminRevenue,        // from admin User.totalRevenue
        weeklyRequests,
        recentRequests: allRequests.slice(0, 8).map(enrichWithPrice),
      },
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get transporteur's personal revenue
exports.getTransporteurRevenue = async (req, res) => {
  try {
    const userId = req.params.id || (req.user && req.user._id);
    if (!userId)
      return res.status(400).json({ message: "User ID required" });

    const user = await User.findById(userId).select("name email totalRevenue role");
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Also count from completed payments for this transporteur
    const payments = await Payment.find({
      transporteur: userId,
      status: "completed",
    });
    const revenueFromPayments = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    res.json({
      userId,
      name: user.name,
      totalRevenue: user.totalRevenue || 0,
      revenueFromPayments,
      completedDeliveries: payments.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/permis-status
exports.getPermisStatus = async (req, res) => {
  try {
    const transporteurs = await User.find({ role: "transporteur" })
      .select("name email permisPhoto permisVerification createdAt")
      .sort({ createdAt: -1 });

    const result = transporteurs.map((t) => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      permisPhoto: t.permisPhoto,
      verification: t.permisVerification?.verdict
        ? {
            score: t.permisVerification.score,
            verdict: t.permisVerification.verdict,
            reasons: t.permisVerification.reasons,
            verifiedAt: t.permisVerification.verifiedAt,
          }
        : null,
      registeredAt: t.createdAt,
    }));

    res.json({ transporteurs: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
