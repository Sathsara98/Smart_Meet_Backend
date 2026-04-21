const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");

router.get("/submitted-questions",
    questionController.getSubmittedQuestions
);

module.exports = router;