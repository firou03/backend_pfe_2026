const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const {

  clearExpiredBanIfNeeded,

  isUserBanned,

  banMessage,

} = require("../utils/userBan");



module.exports = async (req, res, next) => {

  try {

    const authHeader = req.header("Authorization");

    if (!authHeader) {

      return res.status(401).json({ message: "Not authorized" });

    }

    const token = authHeader.replace("Bearer ", "");



    const decoded = jwt.verify(token, process.env.JWT_SECRET);



    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });



    await clearExpiredBanIfNeeded(user);



    if (isUserBanned(user) && user.role !== "admin") {

      return res.status(403).json({

        message: banMessage(user),

        bannedUntil: user.bannedUntil,

      });

    }



    req.user = user;



    next();

  } catch (error) {

    res.status(401).json({ message: "Not authorized" });

  }

};

