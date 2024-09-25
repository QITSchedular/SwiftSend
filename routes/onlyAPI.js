const express = require("express");
const { genDocId } = require("../controllers/Only_API/generateDocId");
const { sendMessage } = require("../controllers/Only_API/messageController");
const { getLogs } = require("../controllers/logsController");

const router = express.Router();

router.post("/gendocid", genDocId);
router.post("/sendmessage", sendMessage);
router.post("/getlogs", getLogs);

module.exports = router;
