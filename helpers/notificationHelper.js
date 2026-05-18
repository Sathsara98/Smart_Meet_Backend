const Notification = require("../schemas/Notification");

const createNotification = async (data) => {

    try {

        await Notification.create(data);

    }
    catch (error) {

        console.log(error);

    }

};

module.exports = createNotification;

