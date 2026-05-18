const express = require("express");

const router = express.Router();

const NotificationController = require("../controllers/notificationController");

router.get(
    "/user/:userId",
    NotificationController.getUserNotifications
);

router.put(
    "/read/:id",
    NotificationController.markRead
);

module.exports = router;


