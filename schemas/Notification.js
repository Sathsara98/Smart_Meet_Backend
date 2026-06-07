const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.set("useFindAndModify", false);


const notification = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meeting"
    },
    type: {
        type: String,
        enum: [
            "NEW_MEETING_ASSIGNED",
            "MEETING_REMINDER",
            "MINUTES_CREATED",
            "RATING_PENDING"
        ],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },

    //prevent duplicate notifications for the same meeting and type
    uniqueKey: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });


const Notification = mongoose.model("Notification", notification);
module.exports = Notification;



