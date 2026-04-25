const express = require("express");
const router = express.Router();
const axios = require("axios");
const Event = require("../schemas/Event");
const auth = require("../authentication/Auth");
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_FROM_EMAIL = process.env.FROM_EMAIL;
const SENDGRID_FROM_NAME = "SmartMeet";

function buildEmailHtml(data) {
  return data
    .map((item) => `<p><strong>${item.field || ""}</strong> ${item.value || ""}</p>`)
    .join("");
}

function sendEmailViaSendGrid(receiver, subject, data) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.error("Missing SendGrid configuration. Skipping email send.");
    return Promise.resolve();
  }

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


router.post("/new", async function (req, res) {
  try {
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

    if (Array.isArray(req.body.members)) {
      req.body.members.forEach((i) => {
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
      });
    }

    return res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      error: error.message || "Failed to create event",
    });
  }
});



router.get("/all", function (req, res, next) {
  Event.find({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});

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
  sendEmailViaSendGrid(email, "You have an Upcoming Meeting", [
    {
      field: "Dear " + userName + " ,",
      value: "You Have been assigned to a meeting, Meeting Details are following",
    },
    {
      field: "Meeting Topic : " + meeting,
      value:
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

module.exports = router;