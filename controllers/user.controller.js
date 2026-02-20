const userModel = require("../models/user.model");

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
    const { name, email, password } = req.body;
    const newUser = new userModel({ name, email, password });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", data: newUser });
  } catch (error) {
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
    const { name, age, location } = req.body
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { name, age, location },
      { new: true },
    );
    if (!updatedUser) {
      throw new Error("User not found");
    }
    res.status(200).json({ message: "User updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await userModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new Error("User not found");
    }
    res
      .status(200)
      .json({ message: "User deleted successfully", data: deletedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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