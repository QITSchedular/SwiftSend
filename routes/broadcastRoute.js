const express = require("express");
const router = express.Router();

// Controllers Imports
const {
    getallBroadcastData,
    getsingleBroadcastData,
    getallmessagestatus
} = require("../controllers/broadcastController");

// Rotues
router.get("/getallBroadcastData/:iid", getallBroadcastData);
router.get("/getsingleBroadcastData/:iid/:brodid", getsingleBroadcastData);
router.get("/getallmessagestatus/:iid", getallmessagestatus);

module.exports = router;
