const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/authMiddleware");

// Get dashboard statistics (public - no auth required)
router.get("/dashboard-stats", adminController.getDashboardStats);

// Get transporteur's personal revenue (protected)
router.get("/transporteur-revenue/:id", authMiddleware, adminController.getTransporteurRevenue);
router.get("/transporteur-revenue", authMiddleware, adminController.getTransporteurRevenue);

module.exports = router;
