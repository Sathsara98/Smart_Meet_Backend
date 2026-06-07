const express = require("express");

const auth = require("../authentication/Auth");

const router = express.Router();

// Import JWT for login token generation
const jwt = require("jsonwebtoken");

// Parse request body data
const bodyParser = require("body-parser");

// Load environment variables from .env file
require("dotenv").config();

// File system module for deleting old images
const fs = require("fs");

// Axios used to call SendGrid email API
const axios = require("axios");

// Database models
const User = require("../schemas/User");
const Event = require("../schemas/Event");

// Secret key used to generate JWT tokens
const accessTokenSecret = process.env.TOKEN_SECRET;

// SendGrid email configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_FROM_EMAIL = process.env.FROM_EMAIL;
const SENDGRID_FROM_NAME = "SmartMeet";


// Converts email content into HTML format
function buildEmailHtml(data) {
  return data
    .map((item) => `<p><strong>${item.field || ""}</strong> ${item.value || ""}</p>`)
    .join("");
}


// Sends email through SendGrid API
function sendEmailViaSendGrid(receiver, subject, data) {

  // Stop if API key is missing
  if (!SENDGRID_API_KEY) {
    console.error("Missing SENDGRID_API_KEY. Skipping email send.");
    return Promise.resolve();
  }

  // Call SendGrid API
  return axios.post(
    SENDGRID_ENDPOINT,
    {
      personalizations: [
        {
          to: [{ email: receiver }],
          subject,
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME
      },
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


// =======================================
// REGISTER NEW USER
// =======================================
router.post("/register", async function (req, res, next) {
  try {

    // Convert email to lowercase
    const email = req.body.email.toLowerCase().trim();

    // Convert NIC to uppercase
    const nic = req.body.nic.toUpperCase().trim();

    // Check whether email or NIC already exists
    const existingUser = await User.findOne({
      $or: [{ email: email }, { nic: nic }],
    });

    // Return duplicate error
    if (existingUser) {

      if (existingUser.email === email) {
        return res.json({
          error: "This Email is already registered in the system",
        });
      }

      if (existingUser.nic === nic) {
        return res.json({
          error: "This NIC is already registered in the system",
        });
      }
    }

    // Generate random password
    const password = genPassword();

    // Save user into MongoDB
    User.create({
      utype: req.body.utype,
      name: req.body.name,
      nic: nic,
      email: email,
      tel: req.body.tel,
      sector: req.body.sector,
      workplace: req.body.workplace,
      gender: req.body.gender,
      password: password,
    });

    // Send login credentials to email
    sendEmailViaSendGrid(email, "SmartMeet - Registration Successful!", [
      {
        field:
          "Hi, " +
          req.body.name +
          " you have been registered as a " +
          req.body.utype,
        value: "Use the following credentials to login",
      },
      {
        field: "Username :",
        value: email,
      },
      {
        field: "Password :",
        value: password,
      },
    ]);

  } catch (error) {

    // Handle registration errors
    console.log(error);

    res.json({
      error: "Something went wrong while registering member",
    });
  }
});


// =======================================
// FORGET PASSWORD
// =======================================
router.post("/forget", async function (req, res, next) {

  // Generate new password
  const passNew = genPassword();

  // Update password in database
  User.findOneAndUpdate(
    { email: req.body.email },
    { $set: { password: passNew } }
  );

  // Send new password to user email
  sendEmailViaSendGrid(
    req.body.email,
    "Your Password Has been reset",
    [
      {
        field: "Use Your New Password",
        value: passNew,
      },
    ]
  );
});



router.get("/register/:type", async function (req, res) {
  try {
    const type = req.params.type;


    let sector = "";


    if (type === "public") sector = "Public";
    else if (type === "private") sector = "Private";
    else if (type === "academic") sector = "Academic";
    else if (type === "association") sector = "Association";


    const members = await User.find({ sector: sector });


    res.json(members);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load members",
    });
  }
});



// =======================================
// GET ALL USERS
// =======================================
router.get("/register", function (req, res, next) {

  // Return all users
  User.find({}).then(function (item) {
    res.send(item);
  });
});


// =======================================
// GET USER'S MEETINGS
// =======================================
router.post("/getMeetings", async function (req, res, next) {

  try {

    // Check user id exists
    if (!req.body.id) {
      return res.json({ error: "No ID" });
    }

    // Get all meetings
    const events = await Event.find({})
      .select("name time date members");

    // Filter meetings assigned to user
    const userMeetings = events.filter((event) =>
      Array.isArray(event.members) &&
      event.members.some(
        (member) => member && String(member._id) === String(req.body.id)
      )
    );

    // Return meetings
    res.send(userMeetings);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Failed to load meetings"
    });
  }
});


// =======================================
// LOGIN
// =======================================
router.post("/login", async function (req, res) {

  // Find matching email and password
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password,
  });

  if (user) {

    // Generate JWT token
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.utype,
        name: user.name,
      },
      accessTokenSecret
    );

    // Send token to frontend
    res.json({
      accessToken,
    });

  } else {

    // Invalid credentials
    res.json({
      error: "Username or password incorrect"
    });
  }
});


// =======================================
// SYSTEM STATISTICS
// =======================================
router.get("/stats", async function (req, res, next) {

  // Count Public members
  let publicCount = await User.find({
    sector: "Public"
  }).then((item) => item.length);

  // Count Private members
  let privateCount = await User.find({
    sector: "Private"
  }).then((item) => item.length);

  // Count Academic members
  let academicCount = await User.find({
    sector: "Academic"
  }).then((item) => item.length);

  // Count Association members
  let associationCount = await User.find({
    sector: "Association"
  }).then((item) => item.length);

  // Return counts
  res.json({
    Public: publicCount,
    Private: privateCount,
    Academic: academicCount,
    Association: associationCount,
  });
});


// =======================================
// GENERATE RANDOM PASSWORD
// =======================================
function genPassword() {

  // Stores generated password
  var result = "";

  // Allowed characters
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  // Create 8-character password
  for (var i = 0; i < 8; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return result;
}


// =======================================
// IMAGE UPLOAD CONFIGURATION
// =======================================

// Multer package for file uploads
const multer = require("multer");

// Upload folder configuration
const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    // Save inside uploads folder
    cb(null, "./uploads/");
  },

  filename: function (req, file, cb) {

    // Save unique file name
    cb(null, Date.now() + file.originalname);
  },
});


// Accept only image files
const Imagfilter = (req, file, cb) => {

  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg"
  ) {

    cb(null, true);

  } else {

    cb(null, false);
  }
};


// Upload middleware
const ImageUpload = multer({
  storage: storage,
  limits: { fileSize: 8194304 }, // 8MB
  fileFilter: Imagfilter,
});


// =======================================
// UPDATE USER PROFILE IMAGE
// =======================================
router.put(
  "/user-image",
  ImageUpload.fields([{ name: "userImg", maxCount: 1 }]),
  (req, res, next) => {

    // Delete previous image if exists
    if (req.body.previousImg != "") {

      fs.unlink("./" + req.body.previousImg, function (res) {
        console.log("Previous image deleted");
      });
    }

    // Save new image path in database
    User.findByIdAndUpdate(
      { _id: req.body.userID },
      {
        userImage:
          req.files["userImg"][0].path.replace("\\", "/"),
      }
    );
  }
);


// =======================================
// UPDATE USER PROFILE DETAILS
// =======================================
router.put("/register", function (req, res, next) {

  User.findByIdAndUpdate(
    { _id: req.body.id },
    {
      name: req.body.name,
      nic: req.body.nic.toUpperCase().trim(),
      email: req.body.email,
      tel: req.body.tel,
      sector: req.body.sector,
      workplace: req.body.workplace,
      password: req.body.password,
    }
  );

});


// =======================================
// GET USER BY ID
// =======================================
router.post("/register/user", function (req, res, next) {

  User.find({
    _id: req.body.id,
  }).then(function (item) {

    res.send(item);
  });
});


// Export routes to app.js
module.exports = router;

