const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user.model");
const { assignAndSendVerificationEmail } = require("../utils/emailVerification");
const { validateRegistrationEmail, normalizeEmail } = require("../utils/emailValidation");
const {
  sanitizeUser,
  sendVerificationAfterRegister,
  handleExistingUnverifiedUser,
} = require("../utils/registrationHelpers");
const { verifyPermisInBackground } = require("../utils/permisVerification");
const {
  clearExpiredBanIfNeeded,
  isUserBanned,
  banMessage,
} = require("../utils/userBan");

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

    const emailCheck = validateRegistrationEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }

    if (!password) {
      return res.status(400).json({ message: "Le mot de passe est obligatoire." });
    }
    if (role === "transporteur" && !permisPhoto) {
      return res.status(400).json({
        message: "Le permis de conduire est obligatoire pour les transporteurs.",
      });
    }

    const normalizedEmail = emailCheck.email;
    const existUser = await User.findOne({ email: normalizedEmail });
    if (existUser) {
      if (existUser.isVerified === false) {
        return handleExistingUnverifiedUser(existUser, res);
      }
      return res.status(400).json({ message: "Un compte existe déjà avec cet email." });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      isVerified: false,
      dateNaissance: role === "transporteur" ? dateNaissance : null,
      permisPhoto: role === "transporteur" ? permisPhoto : null,
    });

    await user.save();

    if (role === "transporteur" && permisPhoto) {
      verifyPermisInBackground(user._id, permisPhoto);
    }

    return sendVerificationAfterRegister(user, res, 201);
  } catch (error) {
    console.error("Register error:", error);
    if (error.name === "ValidationError") {
      const { formatValidationError } = require("../utils/authErrors");
      return res.status(400).json({ message: formatValidationError(error) });
    }
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
};

// VERIFY EMAIL
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Lien invalide ou expiré." });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.json({
      message: "Email vérifié avec succès. Vous pouvez vous connecter.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Erreur lors de la vérification." });
  }
};

// RESEND VERIFICATION EMAIL
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "L'email est obligatoire." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
    }

    if (user.isVerified !== false) {
      return res.status(400).json({ message: "Ce compte est déjà vérifié." });
    }

    await assignAndSendVerificationEmail(user);

    res.json({
      message: "Un nouvel email de vérification a été envoyé.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
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

    // Static Admin Login
    if (email === "admin@gmail.com" && password === "Admin123") {
      let admin = await User.findOne({ email: "admin@gmail.com", role: "admin" });

      if (!admin) {
        admin = {
          _id: "static_admin_id",
          name: "Administrator",
          email: "admin@gmail.com",
          role: "admin",
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
        user: admin,
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

    if (user.isVerified === false) {
      return res.status(403).json({
        message: "Veuillez vérifier votre email avant de vous connecter.",
        needsVerification: true,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
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
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s/g, ""),
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password/${resetToken}`;

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
