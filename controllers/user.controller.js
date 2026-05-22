const userModel = require("../models/user.model");
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
    const permisPhoto =
      role === "transporteur" && req.file ? req.file.filename : null;

    const newUser = new userModel({
      name,
      email,
      password,
      role,
      dateNaissance: role === "transporteur" ? dateNaissance : null,
      permisPhoto,
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error(error); // 🔥 ADD THIS FOR DEBUG
    res.status(500).json({ error: error.message });
  }
};

module.exports.createUserAdmin = async (req, res) => {
  try {
    const { email, password ,tel} = req.body;
    const newUser = new userModel({ email, password, tel ,role:"admin"});
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

module.exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );
    if (!updatedUser) {
      throw new Error("User not found");
    }
    res.status(200).json({ message: "User updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const user_image = req.file.filename;
    const newUser = new userModel({ email, password, user_image});
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
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