const express = require("express");
const router = express.Router();
const axios = require("axios");
const Question = require("../schemas/Question");
const Minute = require("../schemas/Minute");
const auth = require("../Authentication/Auth");

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
router.post("/new-minute", function (req, res, next) {
  Minute.create({
    body: req.body.question,
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
  })
    .then(function (item) {
      res.send(item);
    })
    .catch(next);
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
router.put("/minute-each", function (req, res, next) {
  Minute.findByIdAndUpdate(
    { _id: req.body.id },
    {
      meeting_activities_each: req.body.activities_each,
    }
  ).then(function () {
    Minute.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});
router.delete("/minute", function (req, res, next) {
  Minute.findByIdAndRemove({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});
module.exports = router;
