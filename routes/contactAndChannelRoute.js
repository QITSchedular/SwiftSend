const express = require("express");
const {
    addContactToChannelByCSV,
    getallcontactwithchannellist
} = require("../controllers/contactAndChannelController");

const router = express.Router();

router.post("/addcontacttochannelbycsv", addContactToChannelByCSV);
router.get("/getallcontactbyallchannel/:iid", getallcontactwithchannellist);

module.exports = router;
