const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const upload = require("../middlewares/uploadfile");

router.post("/register", upload.single("permis"), authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:token", authController.resetPassword);



module.exports = router;