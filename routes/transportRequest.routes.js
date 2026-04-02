const express = require("express");
const router = express.Router();
const controller = require("../controllers/transportRequest.controller");

const auth = require("../middlewares/authMiddleware");
const checkRole = require("../middlewares/checkRole");

// Create request → seulement user connecté
router.post("/", auth, controller.createRequest);

// Get all → user connecté
router.get("/", auth, controller.getAllRequests);

// Accept request → 🔥 SEULEMENT transporteur
router.put(
  "/accept/:id",
  auth,
  checkRole("transporteur"),
  controller.acceptRequest
);

module.exports = router;