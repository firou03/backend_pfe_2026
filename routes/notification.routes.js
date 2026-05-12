const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notification.controller");

// All routes protected by auth middleware
router.use(authMiddleware);

// GET all notifications for current user
router.get("/", notificationController.getMyNotifications);

// GET unread count
router.get("/unread-count", notificationController.getUnreadCount);

// PATCH mark one notification as read
router.patch("/:id/read", notificationController.markAsRead);

// PATCH mark all notifications as read
router.patch("/read-all", notificationController.markAllAsRead);

// DELETE one notification
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
