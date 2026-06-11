const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user.model");

const PERMIS_VERIFIER_URL = process.env.PERMIS_VERIFIER_URL || "http://127.0.0.1:8000";

async function verifyPermisInBackground(userId, imagePath) {
  try {
    const absolutePath = path.join(__dirname, "..", "public", "images", imagePath);
    if (!fs.existsSync(absolutePath)) return;

    const form = new FormData();
    form.append("image", fs.createReadStream(absolutePath), {
      filename: imagePath,
      contentType: "image/jpeg",
    });

    const response = await axios.post(`${PERMIS_VERIFIER_URL}/verify`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    const { score, verdict, reasons } = response.data;
    await User.findByIdAndUpdate(userId, {
      permisVerification: { score, verdict, reasons, verifiedAt: new Date() },
    });
    console.log(`[permis] user ${userId} → ${verdict} (${score}/100)`);
  } catch (err) {
    console.error(`[permis] verification failed for user ${userId}:`, err.message);
  }
}

module.exports = { verifyPermisInBackground };
