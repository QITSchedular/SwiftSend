const conn = require('../DB/connection');
const status = require("../assets/js/status");


const checkApi = (req, res, next) => {
    let apikey = req.body.apikey || req.cookies.apikey;

    conn.query(`SELECT * FROM users WHERE apikey = '${apikey}'`, (error, results) => {
        if (error) return res.status(500).send(status.internalservererror());
        if (results.length <= 0) return res.status(401).send(status.unauthorized());
        next();
    });
}

const checkAdmin = (req, res, next) => {
    let apikey = req.cookies.apikey;
    if (!apikey) return res.status(401).send(status.unauthorized());

    const newAPI = Buffer.from(apikey, "base64").toString("ascii")

    conn.query(`SELECT * FROM admin WHERE apikey = ?`, [newAPI], (error, results) => {
        if (error) return res.status(500).send(status.internalservererror());
        if (results.length <= 0) return res.status(401).send(status.unauthorized());
        next();
    });
}

const checkMsgLimit = (req, res, next) => {
    let apikey = req.body.apikey || req.cookies.apikey;
    let iid = req.body.iid;

    conn.query(`SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count FROM single_message m WHERE m.apikey = '${apikey}' AND DATE(m.time) = CURDATE() GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND DATE(b.time) = CURDATE() GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`,
        (error, results) => {
            if (error) return res.status(500).send(status.internalservererror());
            let instanceData = results.filter(x => x.iid == iid)
            if (instanceData.length > 0) {
                if (instanceData[0].total_count >= 1000) {
                    return res.status(429).send(Object.assign(status.overlimit(), { success: false }, {
                        data: {
                            detail: `Message limit exceed over 1000`,
                        },
                    }));
                }
            }
            next();
        }
    );
}

const checkFileType = (req, res, next) => {
    const allowedMimeTypes = {
        audio: ["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg", "audio/opus"],
        document: [
            "application/vnd.ms-powerpoint", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/pdf", "text/plain", "application/vnd.ms-excel"
        ],
        image: ["image/jpeg", "image/png", "image/webp"],
        video: ["video/mp4", "video/3gpp"],
        sticker: ["image/webp"]
    };

    const sizeLimits = {
        audio: 16 * 1024 * 1024,     // 16 MB
        document: 100 * 1024 * 1024,  // 100 MB
        image: 5 * 1024 * 1024,       // 5 MB
        sticker: 100 * 1024,          // 100 KB
        video: 16 * 1024 * 1024       // 16 MB
    };

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            message: "No files were uploaded.",
        });
    }

    if (Array.isArray(req.files.file)) {
        return res.status(400).json({
            message: "Only one file can be uploaded at a time.",
        });
    }


    const uploadedFile = req.files.file;
    const fileType = uploadedFile.mimetype;
    const fileSize = uploadedFile.size;

    let mediaType;
    for (const [type, mimes] of Object.entries(allowedMimeTypes)) {
        if (mimes.includes(fileType)) {
            mediaType = type;
            break;
        }
    }

    if (!mediaType) {
        return res.status(400).json({
            message: "Invalid file type. Accepted formats are: AAC, MP4 Audio, MPEG Audio, AMR, OGG, Opus, PowerPoint, Word Document, Excel, PDF, Plain Text, JPEG, PNG, WEBP, MP4 Video, and 3GPP Video.",
            allowedTypes: [
                "AAC", "MP4 Audio", "MPEG Audio", "AMR", "OGG", "Opus", "PowerPoint",
                "Word Document", "Excel Spreadsheet", "PDF", "Plain Text",
                "JPEG", "PNG", "WEBP", "MP4 Video", "3GPP Video"
            ]
        });
    }

    // Check file size
    if (fileSize >= sizeLimits[mediaType]) {
        return res.status(400).json({
            message: `File size exceeds the allowed limit for ${mediaType}. Maximum allowed size is ${sizeLimits[mediaType] / (1024 * 1024)} MB.`,
            allowedSizeMB: {
                audio: 16,
                document: 100,
                image: 5,
                sticker: 0.1,
                video: 16
            }
        });
    }
    next();
}

const encodeDataMiddleware = (req, res, next) => {
    try {
        if (req.originalUrl === '/api/v1.0/signin') {
            req.body.email = Buffer.from(req.body.email, 'ascii').toString('base64');
            req.body.password = Buffer.from(req.body.password, 'ascii').toString('base64');
            req.body.type = Buffer.from(req.body.type, 'ascii').toString('base64');
        }
        next();
    } catch (error) {
        res.status(400).send("Invalid encoded data");
    }
};


module.exports = { checkMsgLimit, checkApi, checkAdmin, checkFileType, encodeDataMiddleware };