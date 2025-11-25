const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RegisterSchema = new Schema({
  utype: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  tel: {
    type: String,
    required: true,
  },
  sector: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  workplace: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userImage: {
    type: String,
  },
  nat: {
    type: [
      {
        type: Number,
      },
    ],
    default: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
});

module.exports = mongoose.model("register", RegisterSchema);
