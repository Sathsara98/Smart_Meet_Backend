const express = require("express");
const router = express.Router();
const axios = require("axios");
const Question = require("../schemas/Question");
const Minute = require("../schemas/Minute");
const auth = require("../authentication/Auth");

const Event = require("../schemas/Event");

// router.post("/new-question", async (req, res, next) => {
//   try {
//     console.log("Received data:", req.body);

//     const { questions, createdBy, status } = req.body;

//     if (!questions || !Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ message: "No questions submitted" });
//     }

//     // create a new document with the array and creator
//     const newSubmission = await Question.create({
//       questions,
//       createdBy,
//     });

//     console.log("Saved submission:", newSubmission);
//     res.status(201).json({ message: "Submission saved", data: newSubmission });
//   } catch (err) {
//     console.error("Error saving questions:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

router.post("/new-question", async (req, res, next) => {
  try {
    console.log("Received data:", req.body);

    const { questions, createdBy, status, maxArea } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions submitted" });
    }

    const newSubmission = await Question.create({
      questions,
      createdBy,
      status: status || "submitted",
      maxArea,
    });

    console.log("Saved submission:", newSubmission);
    res
      .status(201)
      .json({ message: "Submission saved", data: newSubmission });
  } catch (err) {
    console.error("Error saving questions:", err);
    res.status(500).json({ message: err.message });
  }
});




router.get("/questions", function (req, res, next) {
  Question.find({}).then(function (item) {
    res.send(item);
  });
});

// get a single submission by ID
router.get("/questions/:id", async (req, res) => {
  try {
    const doc = await Question.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json(doc);
  } catch (err) {
    console.error("Error fetching submission:", err);
    res.status(500).json({ message: err.message });
  }
});


// update an existing submission (questions, status, maxArea)
router.put("/questions/:id", async (req, res) => {
  try {
    const { questions, status, maxArea } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions submitted" });
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      {
        questions,
        status: status || "submitted",
        maxArea,
        // optional: update timestamp
        submissionDate: Date.now(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({ message: "Submission updated", data: updated });
  } catch (err) {
    console.error("Error updating submission:", err);
    res.status(500).json({ message: err.message });
  }
});





router.put("/questions", function (req, res, next) {
  Question.findByIdAndUpdate(
    { _id: req.body.id },
    {
      body: req.body.message,
    }
  ).then(function () {
    Question.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});

router.delete("/questions", function (req, res, next) {
  Question.findByIdAndRemove({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});
router.delete("/questions-all", function (req, res, next) {
  // db.orders.deleteMany( { "client" : "Crude Traders Inc." } );
  Question.deleteMany({}).then(function (item) {
    res.send(item);
  });
});


//summary list for My Submission page
router.get("/challenges", async (req, res, next) => {
  try {
    const docs = await Question.find({}).sort({ submissionDate: -1 });

    const rows = docs.map((doc) => ({
      id: doc._id.toString(),
      noOfChallenges: Array.isArray(doc.questions) ? doc.questions.length : 0,
      developmentArea: doc.maxArea || "-", // highest dev area you saved
      // normalize backend status -> 'draft' | 'completed' for frontend
      status: doc.status === "submitted" ? "completed" : "draft",
      createdDate: doc.submissionDate
        ? doc.submissionDate.toISOString().split("T")[0] // YYYY-MM-DD
        : "",
    }));

    res.json(rows);
  } catch (err) {
    console.error("Error fetching challenges:", err);
    res.status(500).json({ message: err.message });
  }
});






router.post("/developing-area", function (req, res, next) {
  axios
    .post("https://mms-ml.herokuapp.com/api/", {
      text: req.body.text,
    })
    .then(function (response) {
      res.send(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
});
router.post("/new-minute", async function (req, res, next) {
  try {
    const existing = await Minute.findOne({
      meeting_id: req.body.meetingId,
    });

    if (existing) {
      return res.status(400).json({
        error: "Minute already created for this meeting",
      });
    }

    const totalParticipants =
      (req.body.private?.length || 0) +
      (req.body.public?.length || 0) +
      (req.body.academic?.length || 0) +
      (req.body.association?.length || 0);

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
      is_finalized: true,
      total_participants: totalParticipants,
      total_rated_participants: 0,
      rating_completed: false,
    });

    res.send(item);
  } catch (error) {
    console.log(error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Minute already created for this meeting",
      });
    }

    next(error);
  }
});

router.get("/minutes", function (req, res, next) {
  Minute.find({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});
router.get("/newest-minute", function (req, res, next) {
  Minute.findOne({}, {}, { sort: { _id: -1 } }).then(function (item) {
    res.send(item);
  });
});

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
    Minute.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});
router.put("/minute-each", async function (req, res, next) {
  try {
    const minute = await Minute.findById(req.body.id);

    if (!minute) {
      return res.status(404).json({ error: "Minute not found" });
    }

    const userID = req.body.userID;
    const userName = req.body.userName;
    const tableData = req.body.tableData;

    if (!userID || !userName || !Array.isArray(tableData)) {
      return res.status(400).json({ error: "Invalid rating payload" });
    }

    const allParticipants = [
      ...(minute.present_private || []),
      ...(minute.present_public || []),
      ...(minute.present_academic || []),
      ...(minute.present_association || []),
    ];

    const normalizedParticipants = allParticipants.map((p) =>
      String(p).trim().toLowerCase()
    );
    const normalizedUser = String(userName).trim().toLowerCase();

    if (!normalizedParticipants.includes(normalizedUser)) {
      return res.status(403).json({
        error: "You are not allowed to rate this meeting",
      });
    }

    const existingIndex = minute.meeting_activities_each.findIndex(
      (item) => item.userID === userID
    );

    if (existingIndex !== -1) {
      minute.meeting_activities_each[existingIndex].tableData = tableData;
    } else {
      minute.meeting_activities_each.push({
        userID,
        tableData,
      });
    }

    const totalParticipants =
      (minute.present_private?.length || 0) +
      (minute.present_public?.length || 0) +
      (minute.present_academic?.length || 0) +
      (minute.present_association?.length || 0);

    const uniqueRatedUsers = [
      ...new Set(minute.meeting_activities_each.map((item) => item.userID)),
    ];

    minute.total_participants = totalParticipants;
    minute.total_rated_participants = uniqueRatedUsers.length;
    minute.rating_completed =
      minute.total_rated_participants === minute.total_participants;

    console.log("Saving rating for:", userName, userID);
    console.log("meeting_activities_each:", minute.meeting_activities_each);
    console.log("total_participants:", minute.total_participants);
    console.log("total_rated_participants:", minute.total_rated_participants);
    console.log("rating_completed:", minute.rating_completed);

    await minute.save();

    return res.json({
      success: true,
      minute,
    });
  } catch (error) {
    console.log("minute-each error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/minute", function (req, res, next) {
  Minute.findByIdAndRemove({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});

router.get("/meetings", async function (req, res, next) {
  try {
    const meetings = await Event.find({}).sort({ _id: -1 });
    res.json(meetings);
  } catch (error) {
    console.log("meetings error:", error);
    res.status(500).json({ error: "Failed to load meetings" });
  }
});

module.exports = router;