const express = require("express");

const router = express.Router();

// router.post("/sample", sampleController.createSampleData);

const { sendSimpleTextTemplate } = require("../controllers/messageController");
const {
  sendBulkMessagesIn,
} = require("../controllers/sendbulkmessagesController");
router.get("/hello", (req, res) => {
  res.send("Hello, world!");
});

//Send simple message

router.post("/sendmessage", sendSimpleTextTemplate);
router.post("/sendinbulk", sendBulkMessagesIn);

module.exports = router;
