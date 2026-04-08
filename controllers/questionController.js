const Question = require("../schemas/Question");
exports.getSubmittedQuestions = async (requestAnimationFrame, res) => {
    try {
        const rows = await Question.aggregate([
            {
                $match: { status: "submitted" }
            },
            {
                $unwind: { path: "$questions" }
            },
            {
                $project: {
                    _id: 0,
                    question: "$questions.body",
                    developmentArea: "$questions.dArea",
                    submissionDate: 1, //from parent doc
                },
            },
        ]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};