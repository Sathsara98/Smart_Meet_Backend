const Notification = require("../schemas/Notification");
const Meeting = require("../schemas/Event");


// This function checks meetings starting within next 24 hours
const sendMeetingReminderNotifications = async () => {
    try {
        const now = new Date();


        // Time after 24 hours from now
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);


        // Find meetings between now and next 24 hours
        const meetings = await Meeting.find({
            date: {
                $gte: now,
                $lte: next24Hours
            }
        });


        for (const meeting of meetings) {
            // Relevant members assigned to the meeting
            const members = meeting.members || [];


            for (const member of members) {
                const userId = member._id || member.userId || member;


                // Unique key avoids duplicate reminders
                const uniqueKey = `MEETING_REMINDER_${meeting._id}_${userId}`;


                await Notification.findOneAndUpdate(
                    { uniqueKey },
                    {
                        userId: userId,
                        meetingId: meeting._id,
                        type: "MEETING_REMINDER",
                        message: `Reminder: Meeting "${meeting.name}" will start within 24 hours.`,
                        isRead: false,
                        uniqueKey: uniqueKey
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
            }
        }


        console.log("Meeting reminder notification check completed");


    } catch (error) {
        console.log("Meeting reminder error:", error);
    }
};


module.exports = sendMeetingReminderNotifications;



