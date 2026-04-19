const TransportRequest = require("../models/transportRequest.model");

// CREATE
exports.createRequest = async (req, res) => {
  try {
    const request = await TransportRequest.create({
      ...req.body,
      client: req.user._id, // ✅ ID du client connecté
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find()
      .populate("client", "name email")
      .populate("transporteur", "name email");

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

    request.status = "accepted";
    request.transporteur = req.user._id; // 🔥 automatique

    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET PENDING ONLY
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.find({ status: "pending" })
      .populate("client", "name email");
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
      status: "accepted"
    }).populate("client", "name email");
    
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
      .populate("transporteur", "name email")
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