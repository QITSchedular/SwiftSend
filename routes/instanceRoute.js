const express = require("express");
const router = express.Router();

// Controllers Imports
const {
    getallInstance,
    createInstance
} = require("../controllers/instanceController");

// Rotues
router.get("/getallInstance", getallInstance);
router.post("/createInstance", createInstance);

module.exports = router;
