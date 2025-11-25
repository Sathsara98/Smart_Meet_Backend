const express = require("express");
const router = express.Router();
const axios = require("axios");
const Event = require("../schemas/Event");
const auth = require("../Authentication/Auth");

router.post("/new", function (req, res, next) {
  Event.create({
    sector: req.body.sector,
    name: req.body.name,
    venue: req.body.venue,
    location: req.body.location,
    time: req.body.time,
    members: req.body.members,
    date: req.body.date,
    questions: req.body.questions,
  })
    .then(function (item) {
      req.body.members.map((i) => {
        sendEventNotification(
          i.name,
          i.email,
          req.body.date,
          req.body.time,
          req.body.venue,
          req.body.location,
          req.body.name
        );
      });
      res.send(item);
    })
    .catch(next);
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
  axios
    .post("https://form-to-email-api.herokuapp.com/api/email", {
      name: "Trade Ministry Sri Lanka",
      receiver: email,
      subject: "You have an Upcoming Meeting",
      data: [
        {
          field: "Dear " + userName + " ,",
          value:
            "You Have been assigned to a meeting, Meeting Details are following",
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
      ],
    })
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`);
      // console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
}

module.exports = router;
