const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.set("useFindAndModify", false);

const event = new Schema({
  sector: {
    type: String,
  },
  name: {
    type: String,
  },
  venue: { type: String },
  location: { type: String },
  time: { type: String },
  members: {
    type: [{}],
  },
  questions: [{}],
  date: {
    type: String,
  },
});

const Event = mongoose.model("events", event);
module.exports = Event;
