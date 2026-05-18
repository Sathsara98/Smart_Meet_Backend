const Notification = require("../schemas/Notification");

exports.getUserNotifications = async (req, res) => {
    try {

        const notifications = await Notification.find({
            userId: req.params.userId
        })
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
};

exports.markRead = async (req, res) => {

    try {

        await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true }
        );

        res.json({
            success: true
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

};

