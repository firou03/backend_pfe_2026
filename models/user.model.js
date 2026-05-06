const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: String,

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please fill a valid email address"],
    },

    password: {
      type: String,
      required: true,
      match: [
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number",
      ],
    },

    age: {
      type: Number,
      min: 20,
      max: 80,
    },

    location: String,
    user_image: String,

    dateNaissance: Date,

    permisPhoto: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["admin", "client", "transporteur"],
      default: "client",
    },
    
    // ⭐ Pour moyenne des notes 
    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // 💰 Revenue tracking (for transporteurs & admin)
    totalRevenue: {
      type: Number,
      default: 0,
    },

    phone: String,
    address: String,
    city: String,
    postalCode: String,
    preference: String,

    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  try {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

module.exports = mongoose.model("User", userSchema);