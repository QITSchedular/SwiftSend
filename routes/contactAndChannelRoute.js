const express = require("express");
const {
    addContactToChannelByCSV
} = require("../controllers/contactAndChannelController");

const router = express.Router();

router.post("/addcontacttochannelbycsv", addContactToChannelByCSV);

module.exports = router;
