const express = require("express");
const router = express.Router();
const controller = require("../controllers/transportRequest.controller");

const auth = require("../middlewares/authMiddleware");
const checkRole = require("../middlewares/checkRole");

// Create request
router.post("/", auth, controller.createRequest);

// Get all
router.get("/", auth, controller.getAllRequests);

// Get pending requests
router.get("/pending", auth, controller.getPendingRequests);

// Get mes requests acceptées
router.get("/mes-requests", auth, controller.getMesRequests);

// Get current client requests
router.get("/my-requests", auth, controller.getMyRequests);

// Accept request
router.put("/accept/:id", auth, controller.acceptRequest);

// Update transporter location for tracking
router.put("/update-location/:id", auth, controller.updateLocation);

// Deliver request
router.put("/deliver/:id", auth, controller.deliverRequest);

// ✅ module.exports TOUJOURS à la fin
module.exports = router;