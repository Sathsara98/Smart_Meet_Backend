const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.set("useFindAndModify", false);

const questionSchema = new Schema({
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  questions: [
    {
      dArea: {
        type: String,
        required: true,
      },
      body: {
        type: String,
        required: true,
      },
    },
  ],
  createdBy: {
    type: String,
    default: "Anonymous",
  },

  // added fields
  status: {
    type: String,
    enum: ["draft", "submitted"],
    default: "draft",
  },

  maxArea: {
    type: String,
  },
});

const Question = mongoose.model("Question", questionSchema);
module.exports = Question;
