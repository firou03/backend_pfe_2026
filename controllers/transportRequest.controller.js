const TransportRequest = require("../models/transportRequest.model");

// CREATE
exports.createRequest = async (req, res) => {
  try {
    const request = await TransportRequest.create(req.body);
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