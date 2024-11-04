const express = require("express");
const router = express.Router();

// Controller
const { SignIn } = require("../controllers/authController");
const { getallInstance } = require("../controllers/instanceController");
const { getAllTemplate } = require("../controllers/templateController");
const { genDocId } = require("../controllers/Only_API/generateDocId");
const { sendMessage } = require("../controllers/Only_API/messageController");
const { getTemplateByIdAPI } = require("../controllers/Only_API/templateController");
const { getLogs } = require("../controllers/logsController");

// Middleware
const { checkFileType, checkMsgLimit, encodeDataMiddleware } = require("../middleware/middleware");
const { VerifyToken } = require("../middleware/verifyToken");


// Routes
router.post("/signin", encodeDataMiddleware, SignIn);
router.get("/getinstances", VerifyToken, getallInstance);
router.get("/gettemplates/:iid", VerifyToken, getAllTemplate);
router.get("/gettemplatebyid/:iid/:tempid", VerifyToken, getTemplateByIdAPI);
router.post("/gendocid", VerifyToken, checkFileType, genDocId);
router.post("/sendmessage", VerifyToken, checkMsgLimit, sendMessage);
router.post("/getlogs", VerifyToken, getLogs);

module.exports = router;
