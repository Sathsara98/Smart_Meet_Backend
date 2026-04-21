const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.set("useFindAndModify", false);

const minute = new Schema(
  {
    meeting_name: { type: String, required: true },
    meeting_date: { type: String, required: true },
    meeting_time: { type: String, required: true },
    meeting_venue: { type: String, required: true },

    sector: { type: String },

    present_private: [{ type: String }],
    present_public: [{ type: String }],
    present_academic: [{ type: String }],
    present_association: [{ type: String }],

    excused: [{ type: String }],
    absent: [{ type: String }],

    meeting_approval_from: { type: String, required: true },
    meeting_motion: { type: String },
    meeting_motionBy: { type: String },
    meeting_proposedBy: { type: String },
    meeting_secondedBy: { type: String },
    meeting_objective: { type: String },

    meeting_activities: [
      {
        activity: String,
        action: String,
        responsibility: String,
      },
    ],

    meeting_activities_each: [
      {
        userID: String,
        tableData: [
          {
            activity: String,
            action: String,
            responsibility: String,
            rating: Number,
          },
        ],
      },
    ],

    meeting_remarks: { type: String },

    is_finalized: {
      type: Boolean,
      default: true,
    },

    rating_completed: {
      type: Boolean,
      default: false,
    },

    total_participants: {
      type: Number,
      default: 0,
    },

    total_rated_participants: {
      type: Number,
      default: 0,
    },

    meeting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "events",
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Minute = mongoose.model("minutes", minute);
module.exports = Minute;