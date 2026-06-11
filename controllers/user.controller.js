const userModel = require("../models/user.model");
const {
  duplicateKeyMessage,
  formatValidationError,
  isDuplicateKeyError,
} = require("../utils/authErrors");
const { validateRegistrationEmail } = require("../utils/emailValidation");
const {
  sendVerificationAfterRegister,
  handleExistingUnverifiedUser,
} = require("../utils/registrationHelpers");
const { verifyPermisInBackground } = require("../utils/permisVerification");
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// module.exports.esm = async (req, res) => {
//   try {
//logic here
//     res.status(200).json({ message: "Hello from user controller" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

module.exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    if (users.length === 0) {
      //return res.status(404).json({ message: "No users found" });
      throw new Error("No users found");
    }
    res
      .status(200)
      .json({ message: "Users retrieved successfully", data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    res
      .status(200)
      .json({ message: "User retrieved successfully", data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, dateNaissance } = req.body;

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
    if (!role || !["client", "transporteur"].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide (client ou transporteur)." });
    }
    if (role === "transporteur" && !req.file) {
      return res.status(400).json({
        message: "Le permis de conduire est obligatoire pour les transporteurs.",
      });
    }

    const existing = await userModel.findOne({ email: emailCheck.email });
    if (existing) {
      if (existing.isVerified === false) {
        return handleExistingUnverifiedUser(existing, res);
      }
      return res.status(400).json({ message: "Un compte existe déjà avec cet email." });
    }

    const permisPhoto =
      role === "transporteur" && req.file ? req.file.filename : null;

    const newUser = new userModel({
      name: name.trim(),
      email: emailCheck.email,
      password,
      role,
      isVerified: false,
      dateNaissance: role === "transporteur" ? dateNaissance : null,
      permisPhoto,
    });

    await newUser.save();

    if (role === "transporteur" && permisPhoto) {
      verifyPermisInBackground(newUser._id, permisPhoto);
    }

    return sendVerificationAfterRegister(newUser, res, 201);
  } catch (error) {
    console.error("createUser error:", error);
    if (isDuplicateKeyError(error)) {
      return res.status(400).json({ message: duplicateKeyMessage(error) });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: formatValidationError(error) });
    }
    res.status(500).json({
      message: error.message || "Erreur serveur lors de l'inscription.",
    });
  }
};

module.exports.createUserAdmin = async (req, res) => {
  try {
    const { email, password ,tel} = req.body;
    const newUser = new userModel({ email, password, tel, role: "admin", isVerified: true });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.createUserModerateur = async (req, res) => {
  try {
    const { name, email, password ,codeModerateur} = req.body;
    const newUser = new userModel({ name, email, password, codeModerateur, role:"moderateur"});
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const PROFILE_UPDATE_FIELDS = ["phone", "address", "city", "postalCode", "preference"];

function pickProfileUpdate(body = {}) {
  const updateData = {};
  for (const key of PROFILE_UPDATE_FIELDS) {
    if (body[key] !== undefined) {
      updateData[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
    }
  }
  return updateData;
}

function toSafeUser(user) {
  const safe = user.toObject ? user.toObject() : { ...user };
  delete safe.password;
  delete safe.resetPasswordToken;
  delete safe.resetPasswordExpires;
  return safe;
}

module.exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = pickProfileUpdate(req.body);

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: "Aucune donnée de profil à mettre à jour." });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      data: toSafeUser(updatedUser),
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: formatValidationError(error) });
    }
    res.status(500).json({ message: error.message || "Erreur lors de la mise à jour du profil" });
  }
};

/** Suspend user for 1 month (replaces permanent delete for admin UI) */
module.exports.banUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Impossible de bannir un administrateur" });
    }

    if (req.user && user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "Vous ne pouvez pas vous bannir vous-même" });
    }

    const bannedUntil = new Date(Date.now() + ONE_MONTH_MS);

    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedUntil = bannedUntil;
    user.bannedBy = req.user?._id || null;
    await user.save();

    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      message: "Utilisateur banni pour 1 mois",
      data: safe,
      bannedUntil,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.unbanUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    user.isBanned = false;
    user.bannedAt = null;
    user.bannedUntil = null;
    user.bannedBy = null;
    await user.save();

    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      message: "Suspension levée",
      data: safe,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** @deprecated Prefer banUser — kept for compatibility */
module.exports.deleteUser = async (req, res) => {
  return module.exports.banUser(req, res);
};

module.exports.createUserWithImage = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailCheck = validateRegistrationEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }

    const existing = await userModel.findOne({ email: emailCheck.email });
    if (existing) {
      if (existing.isVerified === false) {
        return handleExistingUnverifiedUser(existing, res);
      }
      return res.status(400).json({ message: "Un compte existe déjà avec cet email." });
    }

    const user_image = req.file.filename;
    const newUser = new userModel({
      email: emailCheck.email,
      password,
      user_image,
      isVerified: false,
    });
    await newUser.save();
    return sendVerificationAfterRegister(newUser, res, 201);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.updateUserProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!req.file) {
      throw new Error("No image file provided");
    }

    const user_image = req.file.filename;
    
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: { user_image } },
      { new: true }
    );
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    res.status(200).json({ 
      message: "Profile picture updated successfully", 
      data: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};