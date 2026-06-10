const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user.model");
const {
  clearExpiredBanIfNeeded,
  isUserBanned,
  banMessage,
} = require("../utils/userBan");

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

// REGISTER (Sign Up)
exports.register = async (req, res) => {
  try {

    const { name, email, password, role, dateNaissance } = req.body;
 const permisPhoto = req.file ? req.file.filename : null;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Le nom est obligatoire." });
    }
    if (!email?.trim()) {
      return res.status(400).json({ message: "L'email est obligatoire." });
    }
    if (!password) {
      return res.status(400).json({ message: "Le mot de passe est obligatoire." });
    }
    if (role === "transporteur" && !permisPhoto) {
      return res.status(400).json({
        message: "Le permis de conduire est obligatoire pour les transporteurs.",
      });
    }

    const existUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existUser) {
      return res.status(400).json({ message: "Un compte existe déjà avec cet email." });
    }

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
       dateNaissance: role === "transporteur" ? dateNaissance : null,
      permisPhoto: role === "transporteur" ? permisPhoto : null,
    });

    await user.save();

    // Fire-and-forget permis verification (does not block registration)
    if (role === "transporteur" && permisPhoto) {
      verifyPermisInBackground(user._id, permisPhoto);
    }

    res.status(201).json({
      message: "Compte créé avec succès",
      user
    });

  } catch (error) {
    console.error("Register error:", error);
    if (error.name === "ValidationError") {
      const { formatValidationError } = require("../utils/authErrors");
      return res.status(400).json({ message: formatValidationError(error) });
    }
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
};



// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "L'email et le mot de passe sont obligatoires.",
      });
    }

    // 🚀 Check for Static Admin Login
    if (email === "admin@gmail.com" && password === "Admin123") {
      let admin = await User.findOne({ email: "admin@gmail.com", role: "admin" });
      
      // If admin doesn't exist in DB, create a temporary object or fetch it if it exists
      if (!admin) {
        admin = {
          _id: "static_admin_id",
          name: "Administrator",
          email: "admin@gmail.com",
          role: "admin"
        };
      }

      const token = jwt.sign(
        { id: admin._id, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        message: "Login successful (Admin)",
        token,
        user: admin
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
    }

    await clearExpiredBanIfNeeded(user);

    if (isUserBanned(user)) {
      return res.status(403).json({
        message: banMessage(user),
        bannedUntil: user.bannedUntil,
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Mot de passe incorrect." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email est requis" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé avec cet email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s/g, ''), // Remove spaces from app password
      },
    });

    const resetUrl = `http://localhost:3000/auth/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">Bonjour ${user.name || "utilisateur"},</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour procéder :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
          </div>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email de réinitialisation envoyé à:", user.email);
      res.json({ message: "Un lien de réinitialisation a été envoyé à votre email" });
    } catch (emailError) {
      console.error("Erreur d'envoi d'email:", emailError);
      // Clear the reset token if email fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      res.status(500).json({ message: "Erreur lors de l'envoi de l'email. Veuillez réessayer." });
    }

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Erreur lors du traitement de la demande" });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Le jeton est invalide ou a expiré" });
    }

    // Set password - the pre-save middleware will hash it
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();
    res.json({ message: "Mot de passe réinitialisé avec succès !" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Erreur lors de la réinitialisation du mot de passe" });
  }
};