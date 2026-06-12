// Import Express.
// Express is used to create backend APIs.
const express = require("express");

// Create Express router.
// WHY: Routes related to events/meetings are grouped here.
const router = express.Router();

const multer = require("multer");
const path = require("path");

// Import axios.
// Axios is used to call SendGrid email API.
const axios = require("axios");

// Import Event model.
// WHY: Events/meetings are saved and loaded from MongoDB using this model.
const Event = require("../schemas/Event");

// Import Notification model.
// WHY: Notifications are saved for assigned members.
const Notification = require("../schemas/Notification");

// Import Auth.
// In this file, auth is imported but not actively used.
const auth = require("../authentication/Auth");


// Configure where uploaded agenda files should be saved.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/agendas");
  },

  filename: function (req, file, cb) {
    // Create unique filename to avoid duplicate file name issues.
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });



// SendGrid configuration values from environment variables.
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_FROM_EMAIL = process.env.FROM_EMAIL;
const SENDGRID_FROM_NAME = "SmartMeet";


// Build email body as HTML.
function buildEmailHtml(data) {
  return data
    .map((item) => `<p><strong>${item.field || ""}</strong> ${item.value || ""}</p>`)
    .join("");
}


// Send email using SendGrid.
function sendEmailViaSendGrid(receiver, subject, data) {
  // If SendGrid settings are missing, skip email.
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.error("Missing SendGrid configuration. Skipping email send.");
    return Promise.resolve();
  }

  // Send email request to SendGrid.
  return axios.post(
    SENDGRID_ENDPOINT,
    {
      personalizations: [
        {
          to: [{ email: receiver }],
          subject,
        },
      ],
      from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
      content: [
        {
          type: "text/html",
          value: buildEmailHtml(data),
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
}


// Create new meeting/event.
router.post("/new", async function (req, res) {
  try {
    // Save new event in database.
    const newEvent = await Event.create({
      sector: req.body.sector,
      name: req.body.name,
      venue: req.body.venue,
      location: req.body.location,
      time: req.body.time,
      members: Array.isArray(req.body.members) ? req.body.members : [],
      date: req.body.date,
      questions: Array.isArray(req.body.questions) ? req.body.questions : [],
    });

    // Send email and system notification to assigned members.
    if (Array.isArray(req.body.members)) {
      for (const i of req.body.members) {
        // If member has email, send meeting email.
        if (i.email) {
          sendEventNotification(
            i.name,
            i.email,
            req.body.date,
            req.body.time,
            req.body.venue,
            req.body.location,
            req.body.name
          );
        }

        // Get member user ID safely.
        const userId = i.userId || i._id || i.id || null;

        // If user ID exists, create notification.
        if (userId) {
          await Notification.create({
            userId: userId,
            meetingId: newEvent._id,
            type: "NEW_MEETING_ASSIGNED",
            message: `You have been assigned to a meeting: ${req.body.name} on ${req.body.date} at ${req.body.time}`,
            isRead: false,
          });
        }
      };
    }

    // Send created event to frontend.
    return res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      error: error.message || "Failed to create event",
    });
  }
});


// Get all meetings/events.
router.get("/all", function (req, res, next) {
  Event.find({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});


// Send meeting notification email.
function sendEventNotification(
  userName,
  email,
  date,
  time,
  location,
  locationUrl,
  meeting
) {
  console.log("send email" + email);

  // Prepare and send email.
  sendEmailViaSendGrid(email, "You have an Upcoming Meeting", [
    {
      field: "Dear " + userName + " ,",
    },
    {
      value: "You Have been assigned to a meeting, Meeting Details are following",
    },
    {
      field: "Meeting Topic : " + meeting,
      value:
        "<br/>" +
        "Date : " +
        date +
        "<br/>" +
        "Time : " +
        time +
        "<br/>" +
        "Venue : " +
        location,
    },
    {
      field: "Navigate With Google Maps ",
      value: '<a href="' + locationUrl + '"> Click Here </a>',
    },
    {
      field: "Thank You!",
      value: "This is System Generated Email Please Don't Reply!",
    },
  ])
    .then((response) => {
      console.log(`SendGrid status: ${response.status}`);
    })
    .catch((error) => {
      console.error(error.response?.data || error.message);
    });
}


// Create reminder notifications for tomorrow's meetings.
router.post("/create-reminders", async function (req, res) {
  try {
    // Get tomorrow's date.
    const today = new Date();
    today.setDate(today.getDate() + 1);

    // Convert tomorrow date to YYYY-MM-DD.
    const tomorrow = today.toISOString().split("T")[0];

    // Find meetings scheduled for tomorrow.
    const meetings = await Event.find({ date: tomorrow });

    // Create reminder notification for each assigned member.
    for (const meeting of meetings) {
      if (Array.isArray(meeting.members)) {
        for (const member of meeting.members) {
          const userId = member._id || member.id || member.userID;

          if (userId) {
            await Notification.create({
              userId: userId,
              meetingId: meeting._id,
              type: "MEETING_REMINDER",
              message: `Reminder: You have a meeting scheduled: ${meeting.name} on ${meeting.date} at ${meeting.time}.`,
            });
          }
        }
      }
    }

    // Send success response.
    res.send({
      success: true,
      message: "Meeting reminder notifications created",
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});


// Mark member as unable to attend a meeting.
router.put("/unable-to-attend/:meetingId/:userId", async function (req, res) {
  try {
    // Get meeting ID and user ID from URL.
    const { meetingId, userId } = req.params;

    // Get reason from request body.
    const { reason } = req.body;

    // Reason is required.
    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        error: "Reason is required",
      });
    }

    // Find meeting by ID.
    const meeting = await Event.findById(meetingId);

    // If meeting not found, return error.
    if (!meeting) {
      return res.status(404).json({
        error: "Meeting not found",
      });
    }

    // Find member inside meeting members list.
    const memberIndex = meeting.members.findIndex(
      (m) =>
        String(m.userId) === String(userId) ||
        String(m._id) === String(userId) ||
        String(m.id) === String(userId)
    );

    // If member is not assigned to meeting, return error.
    if (memberIndex === -1) {
      return res.status(404).json({
        error: "Member not found in this meeting",
      });
    }

    // Prevent submitting excuse more than once.
    if (meeting.members[memberIndex].unableToAttend === true) {
      return res.status(400).json({
        error: "Already submitted for unable to attend",
      });
    }

    // Save unable-to-attend details.
    meeting.members[memberIndex].unableToAttend = true;
    meeting.members[memberIndex].unableReason = reason;
    meeting.members[memberIndex].attendanceStatus = "UNABLE_TO_ATTEND";

    // Tell Mongoose that nested members array changed.
    meeting.markModified("members");

    // Save updated meeting.
    await meeting.save();

    // Send success response.
    return res.json({
      success: true,
      message: "Unable to attend reason saved successfully",
      member: meeting.members[memberIndex],
    });
  } catch (error) {
    console.error("Unable to attend error:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
});


router.post("/new", upload.single("agendaFile"), async function (req, res) {
  try {
    // If agenda file is uploaded, save its path.
    const agendaFilePath = req.file
      ? `/uploads/agendas/${req.file.filename}`
      : "";

    const newEvent = await Event.create({
      sector: req.body.sector,
      name: req.body.name,
      venue: req.body.venue,
      location: req.body.location,
      time: req.body.time,

      // members comes as string because FormData is used.
      members: req.body.members ? JSON.parse(req.body.members) : [],

      date: req.body.date,

      // questions also comes as string because FormData is used.
      questions: req.body.questions ? JSON.parse(req.body.questions) : [],

      // Save agenda file path in database.
      agendaFile: agendaFilePath,
    });

    return res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      error: error.message || "Failed to create event",
    });
  }
});




// Export router so main app can use these routes.
module.exports = router;

