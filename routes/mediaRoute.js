const express = require("express");
// const upload = require("../middleware/multerConfig");

const router = express.Router();

const { uploadMedia } = require("../controllers/mediaController");


router.post("/uploadMedia", uploadMedia);
// router.post("/uploadMedia", upload.single("image"), uploadMedia);
module.exports = router;