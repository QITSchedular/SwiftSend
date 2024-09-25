const multer = require("multer");

console.log("A");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("B");
        cb(null, "./uploads");
        console.log("A");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage: storage });

module.exports = upload;