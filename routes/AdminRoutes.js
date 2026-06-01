// Import Express.
// Express is used to create backend routes/API endpoints.
const express = require("express");

// Create an Express router.
// WHY: router groups related API endpoints in one file.
const router = express.Router();

// Import axios.
// Axios is used to call external APIs.
const axios = require("axios");

// Import database schemas/models.
const Question = require("../schemas/Question");
const Minute = require("../schemas/Minute");

// Import authentication helper.
// In this file, auth is imported but not used.
const auth = require("../authentication/Auth");

// Import Event schema.
// Event is used to get meeting details.
const Event = require("../schemas/Event");


// Old new-question route is commented.
// WHY: It was replaced by the newer route below that supports status and maxArea.
/*
router.post("/new-question", async (req, res, next) => {
 ...
});
*/


// Create a new question/challenge submission.
router.post("/new-question", async (req, res, next) => {
  try {
    // Print request body for debugging.
    console.log("Received data:", req.body);

    // Get values sent from frontend.
    const { questions, createdBy, status, maxArea } = req.body;

    // Validate questions.
    // WHY: A submission must contain at least one challenge.
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions submitted" });
    }

    // Save new submission in database.
    const newSubmission = await Question.create({
      questions,
      createdBy,

      // If status is not sent, default is submitted.
      status: status || "submitted",

      // Highest-priority development area.
      maxArea,
    });

    console.log("Saved submission:", newSubmission);

    // Send success response to frontend.
    res
      .status(201)
      .json({ message: "Submission saved", data: newSubmission });
  } catch (err) {
    // If error happens, send server error response.
    console.error("Error saving questions:", err);
    res.status(500).json({ message: err.message });
  }
});


// Get all question submissions.
router.get("/questions", function (req, res, next) {
  Question.find({}).then(function (item) {
    res.send(item);
  });
});


// Get a single submission by ID.
router.get("/questions/:id", async (req, res) => {
  try {
    // Find submission by ID from URL.
    const doc = await Question.findById(req.params.id);

    // If submission not found, send 404.
    if (!doc) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Send found submission.
    res.json(doc);
  } catch (err) {
    console.error("Error fetching submission:", err);
    res.status(500).json({ message: err.message });
  }
});


// Update an existing submission.
router.put("/questions/:id", async (req, res) => {
  try {
    // Get updated data from frontend.
    const { questions, status, maxArea } = req.body;

    // Validate questions.
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions submitted" });
    }

    // Find submission by ID and update it.
    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      {
        questions,
        status: status || "submitted",
        maxArea,

        // Update submission date/time.
        submissionDate: Date.now(),
      },
      { new: true }
    );

    // If ID is wrong or submission does not exist.
    if (!updated) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Send updated submission.
    res.json({ message: "Submission updated", data: updated });
  } catch (err) {
    console.error("Error updating submission:", err);
    res.status(500).json({ message: err.message });
  }
});


// Update one question by ID.
// This is older/simple update route.
router.put("/questions", function (req, res, next) {
  Question.findByIdAndUpdate(
    { _id: req.body.id },
    {
      body: req.body.message,
    }
  ).then(function () {
    // After updating, fetch updated record and send it.
    Question.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});


// Delete one question/submission by ID.
router.delete("/questions", function (req, res, next) {
  Question.findByIdAndRemove({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});


// Delete all question submissions.
router.delete("/questions-all", function (req, res, next) {
  Question.deleteMany({}).then(function (item) {
    res.send(item);
  });
});


// Summary list for My Submission page.
router.get("/challenges", async (req, res, next) => {
  try {
    // Get all submissions, newest first.
    const docs = await Question.find({}).sort({ submissionDate: -1 });

    // Convert database records into simple table rows for frontend.
    const rows = docs.map((doc) => ({
      id: doc._id.toString(),

      // Count number of challenges in this submission.
      noOfChallenges: Array.isArray(doc.questions) ? doc.questions.length : 0,

      // Highest development area saved with submission.
      developmentArea: doc.maxArea || "-",

      // Convert backend status into frontend status.
      // submitted means completed in frontend table.
      status: doc.status === "submitted" ? "completed" : "draft",

      // Format date as YYYY-MM-DD.
      createdDate: doc.submissionDate
        ? doc.submissionDate.toISOString().split("T")[0]
        : "",
    }));

    res.json(rows);
  } catch (err) {
    console.error("Error fetching challenges:", err);
    res.status(500).json({ message: err.message });
  }
});


// Send text to external ML API to detect development area.
router.post("/developing-area", function (req, res, next) {
  axios
    .post("https://mms-ml.herokuapp.com/api/", {
      text: req.body.text,
    })
    .then(function (response) {
      // Send ML API response back to frontend.
      res.send(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
});


// Create a new meeting minute.
router.post("/new-minute", async function (req, res, next) {
  try {
    // Check whether minute already exists for this meeting.
    // WHY: One meeting should not have duplicate minutes.
    const existing = await Minute.findOne({
      meeting_id: req.body.meetingId,
    });

    if (existing) {
      return res.status(400).json({
        error: "Minute already created for this meeting",
      });
    }

    // Count total present participants.
    const totalParticipants =
      (req.body.private?.length || 0) +
      (req.body.public?.length || 0) +
      (req.body.academic?.length || 0) +
      (req.body.association?.length || 0);

    // Create minute document in database.
    const item = await Minute.create({
      meeting_id: req.body.meetingId,
      meeting_name: req.body.name,
      meeting_date: req.body.date,
      meeting_time: req.body.time,
      meeting_venue: req.body.venue,
      present_private: req.body.private,
      present_public: req.body.public,
      present_academic: req.body.academic,
      present_association: req.body.association,
      excused: req.body.excused,
      absent: req.body.absent,
      meeting_approval_from: req.body.approval,
      meeting_motion: req.body.motion,
      meeting_motionBy: req.body.motionBy,
      meeting_proposedBy: req.body.proposedBy,
      meeting_secondedBy: req.body.secondedBy,
      meeting_objective: req.body.objective,
      meeting_activities: req.body.activities,
      meeting_remarks: req.body.remarks,

      // Finalized means the minute is officially created.
      is_finalized: true,

      // Rating tracking fields.
      total_participants: totalParticipants,
      total_rated_participants: 0,
      rating_completed: false,
    });

    // Import Notification schema here.
    const Notification = require("../schemas/Notification");

    // Get meeting details related to this minute.
    const meeting = await Event.findById(item.meeting_id);

    // If meeting has members, send notifications to present members.
    if (meeting && Array.isArray(meeting.members)) {

      // Combine all present member names from minute.
      const presentMembers = [
        ...(item.present_private || []),
        ...(item.present_public || []),
        ...(item.present_academic || []),
        ...(item.present_association || [])
      ];

      // Remove duplicate names.
      const uniquePresentMembers = [...new Set(presentMembers)];

      // Match meeting member objects with present member names.
      const presentUsers = meeting.members.filter(member =>
        uniquePresentMembers.includes(member.name)
      );

      // Create notifications for each present member.
      for (const member of presentUsers) {

        // Get user id safely.
        const userId =
          member._id ||
          member.userId ||
          member.id;

        if (userId) {

          // Notification: minutes created.
          await Notification.create({
            userId: userId,
            meetingId: item.meeting_id,
            minuteId: item._id,
            type: "MINUTES_CREATED",
            message: `Minutes have been created for ${item.meeting_name}`,
            isRead: false
          });

          // Notification: rating pending.
          await Notification.create({
            userId: userId,
            meetingId: item.meeting_id,
            minuteId: item._id,
            type: "RATING_PENDING",
            message: "You have not completed your meeting activity ratings",
            isRead: false
          });
        }
      }
    }

    // Send created minute back to frontend.
    res.send(item);
  } catch (error) {
    console.log(error);

    // Duplicate key error handling.
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Minute already created for this meeting",
      });
    }

    next(error);
  }
});


// Get all minutes, newest first.
router.get("/minutes", function (req, res, next) {
  Minute.find({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});


// Get newest/latest minute only.
router.get("/newest-minute", function (req, res, next) {
  Minute.findOne({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});


// Update an existing minute.
router.put("/minute", function (req, res, next) {
  Minute.findByIdAndUpdate(
    { _id: req.body.id },
    {
      meeting_name: req.body.name,
      meeting_date: req.body.date,
      meeting_time: req.body.time,
      meeting_venue: req.body.venue,
      present_private: req.body.private,
      present_public: req.body.public,
      present_academic: req.body.academic,
      present_association: req.body.association,
      excused: req.body.excused,
      absent: req.body.absent,
      meeting_approval_from: req.body.approval,
      meeting_motion: req.body.motion,
      meeting_motionBy: req.body.motionBy,
      meeting_proposedBy: req.body.proposedBy,
      meeting_secondedBy: req.body.secondedBy,
      meeting_objective: req.body.objective,
      meeting_activities: req.body.activities,
      meeting_remarks: req.body.remarks,
    }
  ).then(function () {
    // After update, get updated minute and send it.
    Minute.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});


// Save or update one user's activity ratings for a minute.
router.put("/minute-each", async function (req, res, next) {
  try {
    // Find minute by ID.
    const minute = await Minute.findById(req.body.id);

    if (!minute) {
      return res.status(404).json({ error: "Minute not found" });
    }

    // Get rating payload from frontend.
    const userID = req.body.userID;
    const userName = req.body.userName;
    const tableData = req.body.tableData;

    // Validate rating data.
    if (!userID || !userName || !Array.isArray(tableData)) {
      return res.status(400).json({ error: "Invalid rating payload" });
    }

    // Combine all present participants.
    const allParticipants = [
      ...(minute.present_private || []),
      ...(minute.present_public || []),
      ...(minute.present_academic || []),
      ...(minute.present_association || []),
    ];

    // Normalize names for comparison.
    // WHY: Avoid mismatch due to uppercase/lowercase or extra spaces.
    const normalizedParticipants = allParticipants.map((p) =>
      String(p).trim().toLowerCase()
    );
    const normalizedUser = String(userName).trim().toLowerCase();

    // Only present members can rate.
    if (!normalizedParticipants.includes(normalizedUser)) {
      return res.status(403).json({
        error: "You are not allowed to rate this meeting",
      });
    }

    // Check whether user already rated.
    const existingIndex = minute.meeting_activities_each.findIndex(
      (item) => item.userID === userID
    );

    if (existingIndex !== -1) {
      // If user already rated, update their ratings.
      minute.meeting_activities_each[existingIndex].tableData = tableData;
    } else {
      // If user has not rated, add new rating record.
      minute.meeting_activities_each.push({
        userID,
        tableData,
      });
    }

    // Recalculate total participants.
    const totalParticipants =
      (minute.present_private?.length || 0) +
      (minute.present_public?.length || 0) +
      (minute.present_academic?.length || 0) +
      (minute.present_association?.length || 0);

    // Count unique users who rated.
    const uniqueRatedUsers = [
      ...new Set(minute.meeting_activities_each.map((item) => item.userID)),
    ];

    // Update rating summary fields.
    minute.total_participants = totalParticipants;
    minute.total_rated_participants = uniqueRatedUsers.length;
    minute.rating_completed =
      minute.total_rated_participants === minute.total_participants;

    console.log("Saving rating for:", userName, userID);
    console.log("meeting_activities_each:", minute.meeting_activities_each);
    console.log("total_participants:", minute.total_participants);
    console.log("total_rated_participants:", minute.total_rated_participants);
    console.log("rating_completed:", minute.rating_completed);

    // Save updated minute.
    await minute.save();

    // Send success response.
    return res.json({
      success: true,
      minute,
    });
  } catch (error) {
    console.log("minute-each error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});


// Delete a minute by ID.
router.delete("/minute", function (req, res, next) {
  Minute.findByIdAndRemove({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});


// Get all meetings.
router.get("/meetings", async function (req, res, next) {
  try {
    // Get newest meetings first.
    const meetings = await Event.find({}).sort({ _id: -1 });

    res.json(meetings);
  } catch (error) {
    console.log("meetings error:", error);
    res.status(500).json({ error: "Failed to load meetings" });
  }
});

module.exports = router;

