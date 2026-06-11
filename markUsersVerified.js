// Run: node markUsersVerified.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user.model");

async function markUsersVerified() {
  try {
    await mongoose.connect(process.env.Url_MongoDB);
    console.log("Connected to MongoDB");

    const result = await User.updateMany(
      {},
      {
        $set: { isVerified: true },
        $unset: { verificationToken: "", verificationTokenExpires: "" },
      }
    );

    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log("All users marked as verified.");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

markUsersVerified();
