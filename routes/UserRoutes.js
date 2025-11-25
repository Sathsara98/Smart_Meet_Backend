const express = require("express");
const auth = require("../authentication/Auth");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
//DB models
const User = require("../schemas/User");
const Event = require("../schemas/Event");
//JWT
const accessTokenSecret = process.env.TOKEN_SECRET;

router.post("/register", async function (req, res, next) {
  const validEmail = await User.findOne({ email: req.body.email });
  if (validEmail) {
    return res.json({
      error: "This Email is already registered in the system",
    });
  }

  const password = genPassword();

  User.create({
    utype: req.body.utype,
    name: req.body.name,
    email: req.body.email,
    tel: req.body.tel,
    sector: req.body.sector,
    workplace: req.body.workplace,
    gender: req.body.gender,
    password: password,
  })
    .then(function (item) {
      res.send(item);
    })
    .catch(next);

  axios
    .post("https://form-to-email-api.herokuapp.com/api/email", {
      name: "Trade Ministry Sri Lanka",
      receiver: req.body.email,
      subject: "Registration Successful! - Trade Ministry MMS",
      data: [
        {
          field:
            "Hi, " +
            req.body.name +
            " you have been regsitered as a " +
            req.body.utype +
            "  in Trade Ministry Sri Lanka MMS.",
          value: "Use the following credentials to login to the System",
        },
        {
          field: "Username :",
          value: req.body.email,
        },
        {
          field: "password",
          value: password,
        },
        {
          field: "Thank You!",
          value: "",
        },
      ],
    })
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/email", function (req, res, next) {
  axios
    .post("https://form-to-email-api.herokuapp.com/api/email", {
      name: "PavanS",
      receiver: "ushansankalpafernando@gmail.com",
      subject: "Test mail",
      data: [
        {
          field: "Age",
          value: "21",
        },
        {
          field: "Favourite food",
          value: "Noodles",
        },
      ],
    })
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
});

//Forget Password
router.post("/forget", async function (req, res, next) {
  // const user = User.findOneAndUpdate({ email: req.body.email });
  const passNew = genPassword();
  User.findOneAndUpdate(
    { email: req.body.email },
    { $set: { password: passNew } }
  ).then((user) => {
    res.json(user);
  });

  axios
    .post("https://form-to-email-api.herokuapp.com/api/email", {
      name: "Trade Ministry Sri Lanka",
      receiver: req.body.email,
      subject: "Your Password Has been reset",
      data: [
        {
          field: "Use Your New Password to login to the system",
          value: passNew,
        },
        {
          field: "Thank You!",
          value: "This is System Generated Email Please Do not Reply",
        },
      ],
    })
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/register", function (req, res, next) {
  User.find({}).then(function (item) {
    res.send(item);
  });
});

router.post("/getMeetings", function (req, res, next) {
  console.log("getnot called" + req.body.id);
  if (!req.body.id) {
    return res.json({ error: "No ID" });
  }
  Event.find({
    members: {
      $elemMatch: { _id: req.body.id },
    },
  })
    .select("name time date")
    .then(function (item) {
      res.send(item);
    });
});

router.get("/usersnat", function (req, res, next) {
  User.find({})
    .select("_id name email sector nat utype userImage")
    .then(function (item) {
      res.send(item);
    });
});

router.get("/register/public", function (req, res, next) {
  User.find({ sector: "Public" }).then(function (item) {
    res.send(item);
  });
});

router.get("/register/private", function (req, res, next) {
  User.find({ sector: "Private" }).then(function (item) {
    res.send(item);
  });
});

router.get("/register/association", function (req, res, next) {
  User.find({ sector: "Association" }).then(function (item) {
    res.send(item);
  });
});

router.get("/register/academic", function (req, res, next) {
  User.find({ sector: "Academic" }).then(function (item) {
    res.send(item);
  });
});
router.get("/register/:Cid", auth, function (req, res, next) {
  const userId = req.params.Cid;
  User.findOne({ _id: userId }).then(function (item) {
    res.send(item);
  });
});

router.delete("/delete", auth, function (req, res, next) {
  User.findByIdAndRemove({
    _id: req.body.id,
  }).then(function (item) {
    res.send(item);
  });
});

router.post("/login", async function (req, res) {
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password,
  });

  if (user) {
    // Generate an access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.utype },
      accessTokenSecret
    );

    res.json({
      accessToken,
    });
  } else {
    res.json({ error: "Username or password incorrect" });
  }
});

router.put("/nat", function (req, res, next) {
  User.findByIdAndUpdate(
    { _id: req.body.id },
    {
      nat: req.body.nat,
    }
  ).then(function () {
    User.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});
router.get("/stats", async function (req, res, next) {
  // const { role } = req.user;

  // if (role !== "admin") {
  //   return res.sendStatus(403);
  // }
  let publicCount = 0;
  let privateCount = 0;
  let academicCount = 0;
  let associationCount = 0;
  publicCount = await User.find({ sector: "Public" }).then(function (item) {
    return item.length;
  });
  privateCount = await User.find({ sector: "Private" }).then(function (item) {
    return item.length;
  });
  academicCount = await User.find({ sector: "Academic" }).then(function (item) {
    return item.length;
  });
  associationCount = await User.find({ sector: "Association" }).then(function (
    item
  ) {
    return item.length;
  });

  res.json({
    Public: publicCount,
    Private: privateCount,
    Academic: academicCount,
    Association: associationCount,
  });
});

function genPassword() {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
//User image upload
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const Imagfilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const ImageUpload = multer({
  storage: storage,
  limits: { fileSize: 8194304 },
  fileFilter: Imagfilter,
});
router.put(
  "/user-image",
  ImageUpload.fields([{ name: "userImg", maxCount: 1 }]),
  (req, res, next) => {
    if (req.body.previousImg != "") {
      console.log("./" + req.body.previousImg);
      fs.unlink("./" + req.body.previousImg, function (res) {
        console.log("Previous image deleted");
      });
    }
    User.findByIdAndUpdate(
      { _id: req.body.userID },
      {
        userImage: req.files["userImg"][0].path.replace("\\", "/"),
      }
    )
      .then(function () {
        User.findOne({ _id: req.body.userID }).then(function (single) {
          res.setTimeout(1500, function () {
            res.send(single);
          });
        });
      })
      .catch((error) => {
        res.send(error);
        console.log(error);
      });
  }
);
//user profile update
router.put("/register", function (req, res, next) {
  User.findByIdAndUpdate(
    { _id: req.body.id },
    {
      name: req.body.name,
      email: req.body.email,
      tel: req.body.tel,
      sector: req.body.sector,
      workplace: req.body.workplace,
      password: req.body.password,
    }
  ).then(function () {
    User.findOne({ _id: req.body.id }).then(function (single) {
      res.send(single);
    });
  });
});

//Find user id from name
router.post("/register/user", function (req, res, next) {
  User.find({ _id: req.body.id }).then(function (item) {
    res.send(item);
  });
});

module.exports = router;
