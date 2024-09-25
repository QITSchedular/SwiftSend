const express = require("express");
const { SignIn, updatePassword, AdminSignIn, AddUser } = require("../controllers/authController");
// const upload = require("../middleware/multerConfig");

const router = express.Router();

router.post("/signin", SignIn);
router.post("/adminlogin", AdminSignIn);
router.post("/adduser", AddUser);
router.put("/updatepassword", updatePassword);

module.exports = router;
