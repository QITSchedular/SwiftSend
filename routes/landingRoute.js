const express = require("express");
const router = express.Router();

// Controllers Imports
const { getinquirydata, getLandingData } = require("../controllers/landingController");

// Rotues
router.post("/getInquiryData", getinquirydata);
router.get("/getLandingData", getLandingData);

module.exports = router;
