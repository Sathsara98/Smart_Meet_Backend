var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const Parsbdy = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
var adminRouter = require("./routes/AdminRoutes");
var userRouter = require("./routes/UserRoutes");
var eventRouter = require("./routes/EventRoutes");
var app = express();
require("dotenv").config();

app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods: GET, POST,PUT,PATCH, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(logger("dev"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(Parsbdy.json());

app.use("/admin", adminRouter);
app.use("/users", userRouter);
app.use("/events", eventRouter);

const port = process.env.PORT || 5000;
const mongouri = process.env.ATLAS_URI;

mongoose
  .connect(mongouri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB Connected…");
  })
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully 🚀" });
});


//custom error handling
app.use((req, res, next) => {
  if (req.file) {
    fis.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  const Er = new Error("Not Found");
  Er.status = 404;
  next(Er);
});

//custom error handling
app.use((error, req, res, next) => {
  console.log(error.message);
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

app.listen(port, function () {
  console.log(`Server is running on port: ${port}`);
});

module.exports = app;
