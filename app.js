require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const sessions = require("express-session");
const fileUpload = require("express-fileupload");
const csvtojson = require("csvtojson");
const cors = require("cors");

const axios = require("axios");
const bcrypt = require("bcrypt");
const app = express();
const router = require("./assets/js/route");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const passport = require("passport");
const country = require("country-list-with-dial-code-and-flag");
const status = require("./assets/js/status");
const jwt = require("jsonwebtoken");
const path = require("path");
const conn = require("./DB/connection");
const DomainName = require("./assets/js/url");

const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const Razorpay = require("razorpay");
const crypto = require("crypto");
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const WebSocket = require('ws');
const http = require("http");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let obj = [],
    apikey,
    userProfile;

cloudinary.config({
    // <--------------Old Config-------------->
    // cloud_name: "do6cd8c3p",
    // api_key: "589267637882559",
    // api_secret: "3HypXjPtwO8Jg9Bv23hTR83kY-M"
    // <--------------New Config-------------->
    cloud_name: "dx1ghhk7f",
    api_key: "653234377299131",
    api_secret: "z37qJcan_y9hvTHmdM2ffHrHHIo",
});

let instance = new Razorpay({
    key_id: "rzp_test_HTTzrcP3gKLLEv",
    key_secret: "CGgkDqWQn8f2Sp6vNwqftaXO",
});

app.set('trust proxy', 1);
app.use(express.json());
app.use(fileUpload());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(["/iuser/assets", "/docs/assets", "/instance/assets", "/assets"], express.static("assets"));
app.use("/", router);
app.use(cors());
app.use(
    sessions({
        resave: false,
        saveUninitialized: true,
        secret: "SECRET",
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use('/favicon.ico', express.static(path.join(__dirname, 'assets/images', 'favicon.ico')));


passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

const port = process.argv[2] ? process.argv[2] : 8081;

// Import routes
const sampleRoutes = require("./routes/sendMessage");
const templateRoutes = require("./routes/templateRoute");
const mediaRoutes = require("./routes/mediaRoute");
const userDashboardRoutes = require("./routes/userDashboardRoute");
const signIn2 = require("./routes/authRotues");
const broadcastRoutes = require("./routes/broadcastRoute");
const instanceRoutes = require("./routes/instanceRoute");
const landingRoutes = require("./routes/landingRoute");
const onlyapiRoutes = require("./routes/onlyAPI");
const adminRoutes = require("./routes/adminRoute");
const contactAndChannelRoute = require("./routes/contactAndChannelRoute");

// Middleware

const { checkMsgLimit, checkApi, checkAdmin } = require("./middleware/middleware");
const { VerifyToken } = require("./middleware/verifyToken");

// Use routes
app.use("/api/message", checkApi, checkMsgLimit, sampleRoutes);
app.use("/api/template", checkApi, templateRoutes);
app.use("/api/media", checkApi, mediaRoutes);
app.use("/api/dashboard", checkApi, userDashboardRoutes);
app.use("/api/broadcast", checkApi, broadcastRoutes);
app.use("/api/instance", checkApi, instanceRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/auth", signIn2);
app.use("/api/v1.0/", onlyapiRoutes);
app.use("/api/admin/", checkAdmin, adminRoutes);
app.use("/api/contacts/", checkApi, contactAndChannelRoute);

async function checkAPIKey(apikey) {
    try {
        return await new Promise((resolve, reject) => {
            conn.query(`SELECT * FROM users WHERE apikey = '${apikey}'`, (error, results) => {
                if (error) return reject(status.internalservererror());
                if (results.length <= 0) resolve(false);
                resolve(true);
            });
        });
    } catch (e) {
        console.log(e);
    }
}

async function findData(apikey, column) {
    try {
        return await new Promise((resolve, reject) => {
            conn.query(`SELECT ${column} FROM users WHERE apikey = ?`, [apikey], (error, result) => {
                if (error || result.length <= 0) return reject(status.internalservererror().status_code);
                resolve(result[0][column]);
            });
        });
    } catch (e) {
        console.log(e);
    }
}

function setCookie(res, name, value, days) {
    res.cookie(name, value, { maxAge: 1000 * 60 * 60 * 24 * days });
}

function createfolder(foldername) {
    try {
        const dirs = foldername.split("/");
        let currentDir = "";

        for (const dir of dirs) {
            currentDir = path.join(currentDir, dir);

            if (!fs.existsSync(`${__dirname}/assets/upload/${currentDir}`)) {
                if (fs.mkdirSync(`${__dirname}/assets/upload/${currentDir}`)) {
                    status.ok().status_code;
                } else {
                    status.nodatafound().status_code;
                }
            } else {
                status.duplicateRecord().status_code;
            }
        }
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

function deleteFolder(folderPath) {
    try {
        if (fs.existsSync(`${__dirname}/assets/upload/${folderPath}`)) {
            fs.readdirSync(`${__dirname}/assets/upload/${folderPath}`).forEach(
                (file) => {
                    const currentPath = path.join(
                        `${__dirname}/assets/upload/${folderPath}`,
                        file
                    );
                    if (fs.lstatSync(currentPath).isDirectory()) {
                        // Recursively delete sub-folders and files
                        deleteFolder(currentPath);
                    } else {
                        // Delete file
                        fs.unlinkSync(currentPath);
                    }
                }
            );
            // Delete the empty folder
            fs.rmdirSync(`${__dirname}/assets/upload/${folderPath}`);
            return true;
        } else {
            // Folder doesn't exist
            return false;
        }
    } catch (err) {
        console.log(err);
        return false;
    }
}

const tableData = (data, callback) => {
    try {
        const sql = `SELECT * FROM ${data.table} WHERE ${data.paramstr} AND apikey = '${data.apikey}'`;
        // console.log(sql);
        conn.query(sql, (err, result) => {
            if (err) return callback(Object.assign(status.internalservererror(), { error: err }));
            // if (err) return callback(status.internalservererror());
            if (result.length == 0) return callback(status.nodatafound());
            return callback(result);
        });
    } catch (e) {
        console.log(e);
        callback(status.internalservererror());
    }
};

const tableDataAdmin = (data, callback) => {
    try {
        if (data.table == "users") {
            conn.query(
                `SELECT apikey,uname,email,phone,phoneverify,country,state,city,registrationDate,image FROM users WHERE ${data.paramstr} LIMIT ${data.offset},${data.limit}`,
                (err, results) => {
                    if (err) return callback(status.internalservererror());
                    if (results.length == 0) return callback(status.nodatafound());
                    return callback(results);
                }
            );
        } else {
            conn.query(
                `SELECT * FROM ${data.table} WHERE ${data.paramstr} LIMIT ${data.offset},${data.limit}`,
                (err, result) => {
                    if (err) return callback(status.internalservererror());
                    if (result.length == 0) return callback(status.nodatafound());
                    return callback(result);
                }
            );
        }
    } catch (e) {
        console.log(e);
    }
};

async function sendEmail(sender, contacts, subject, body, attachments = null) {
    let transporter = nodemailer.createTransport({
        host: sender.hostname,
        port: sender.port,
        secure: true,
        auth: {
            user: sender.email,
            pass: sender.passcode,
        },
    });

    let mailOptions = {
        from: sender.email,
        to: contacts.to,
        bcc: contacts.bcc,
        subject: subject,
        html: body,
        attachments: attachments,
    };

    return await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function (error) {
            if (error) return reject(error);
            return resolve();
        });
    });
}

const CREDENTIALS = {
    type: "service_account",
    project_id: "spreadsheet-388213",
    private_key_id: "84c50f351ad013dc493dbb5f1882048bb2915e72",
    private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDlhynmxOBwXPyF\nwInXq643+6QSx0q80huaNicFdHndTBzrO50ceUETmnz4KAO+dBKYYlCdciIYFXuW\n42Ftm362t4z/5UmZIBhL3z7cajyRFb4Ttwy0Y3PYiUio7aGjVwwTRTSa9z309ybh\nbUD2nczL818lBf7h/i07ZwjGGnPBOj1P+QrWnmxB+EBXWqoxBIUzTvqr56Sghdpo\ngtGQmvDJkUt5JGJjINWeQtjMWOFhtceledJyloeW/kxnMm73JGVSMaQrWVHNP31F\nt4KMh/0rtyDxli7+uqozWuYfJzRmWnQrSf9vUVDirK7FjJco9vey9wpDhSCQ9pLY\nBtfM4wd/AgMBAAECggEAMHNJqwbgAZf/ThSIhFgfHH4n8jbTVexcGz9XGVWu68HH\nUPhyf7IwxHyV6KQ5thg2XKhUMAgJnl/aiM1SoZpzMwqn3tR9pq8ZsdpcIJbkVhPq\n3aqEKgfcSlcgWVhgCGS1jdPL+PI7x9vr/yXa0rQYqOykpuIPHZFT5vgm5/ppeN31\n77qP34GFiyxXZgs/0ogGQ8UwKPQqV41mYNuXRCDg7FXSrfI4vaHvxDlpnjQ45LL4\n2t6ENVIc2A2CrwemB5g5LXh0Km8c8o2iDQAm1y/xFHtMrkY+WqebBNUp9nmJU24K\nHboai16F/etlJRKV/zyHgui8eSb+LgGmeKwRIZ+fYQKBgQD7U8Jh6Ph0JI27i0bn\nq1VMx8j3IXoP/haUAoIPq90LJ2pOFrN1pSNqV4G7Ui1XcNbh2+cgMYJRogaKvv50\nJJxe4jPFq2BLLLRgS1cHVrCe9jwx4rd/+YpQ3J4zoTcutksTExnyo1S4A2irg9bq\nBbxSz9PokiXp9lIzqst8jaDzZwKBgQDpy6WWRh0yZKm4wKEHzzoH+jVLtUeoeiwa\nRwajxbl5K74e9QWoBEwAwgODtOiHqo2+CpMe2GhxbekpKi1MXri3Y6MW9gyBNhdV\neyHAeABL4YiuHOqp0nxM0jyp/HwlkpyU8z9UiE/rSSnTpx9ujnmfKTrnVGl6PYcD\niIa2hSgUKQKBgQDgXyqOVnpY1bli0Th/4snIPiP/3PcoB+MISCTs8LXqG0ogZMva\nH4+6hFzhar/n7GkqQjPY3dpGHqxQeaqY7YZcfv1RX2ocMtDllt0fRBlyEMo0jv7b\nVWBSSGNEHI0zOrNTWB42K/KaRRDQ7maTjoNOOxQn8TG/6ZQBZF092QLzyQKBgBl8\nQYioC/a6UmX5WZRoWoMUG0stb6pF5xjWNTsVCqrSwd7OBtfR4BcVDx0EU3S2es0E\nihUKshfrS0dZeaahjLExA041dBeBtflzerJoYl/jLesM6+enMjWNlV9STpYp7Tev\nbG/ijBOx3gVcami6zzcyX2FoKjdRDa6s60JqMXxBAoGAWTydVTrmiMR0HgG7aRq+\nJpWncu+PMkWxWR80E+KGPtu1fbtyLLEk2cjeKGaYfFJg2QApLz2zqNWJSnjku0Iv\nCuDhXDmAsrzTeS1f+jqsuNjjynbTYTdmJTR5N6q5hPyQMa6qqzrILvT0XgHlpRp4\nFEYmkO6Ewp2EUaUQ/nOTQAo=\n-----END PRIVATE KEY-----\n",
    client_email: "asxsx-822@spreadsheet-388213.iam.gserviceaccount.com",
    client_id: "101824858231340519823",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/asxsx-822%40spreadsheet-388213.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
};

passport.use(
    new GoogleStrategy(
        {
            clientID:
                "552657255780-ud1996049ike2guu982i3ms5ver5gbsf.apps.googleusercontent.com",
            clientSecret: "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",
            // callbackURL: `http://localhost:8081/auth/google/callback`,
            callbackURL: `${process.argv[2] ? DomainName : `http://localhost:8081`
                }/auth/google/callback`,
        },
        function (accessToken, refreshToken, profile, done) {
            userProfile = profile;
            return done(null, userProfile);
        }
    )
);

app.get("/webhook", (req, res) => {
    const token = "apple";

    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === token
    ) {
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        res.sendStatus(400);
    }
});

const clients = new Map();
wss.on('connection', (ws) => {
    const clientId = crypto.randomBytes(8).toString("hex");

    clients.set(clientId, ws);

    ws.on('message', (message) => {
        console.log(`Received message from client ${clientId}: ${message}`);
    });

    ws.on('close', () => {
        clients.delete(clientId);
    });

    ws.send(JSON.stringify({ message: 'Welcome!', clientId: clientId }));
});

// Route for handling incoming messages
app.post("/webhook", (req, res) => {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
        const message = body.entry[0].changes[0];
        const statuses = message.value.statuses;

        console.log("statuses before : ", statuses);
        if (statuses) {
            console.log("statuses after : ", statuses);
            console.log("statuses.error : ", statuses[0].errors);
            updateMessageStatus(statuses);
        }
        else {
            console.log("No statuses found in the message.");
        }
        res.sendStatus(200);
    }
    else {
        res.sendStatus(404);
    }
});

const updateMessageStatus = async (statuses) => {
    for (const status of statuses) {
        const { id, status: messageStatus, recipient_id } = status;
        const query = `UPDATE message_info SET status = ? WHERE waba_message_id = ?;`;
        const values = [messageStatus, id];

        try {
            await new Promise((resolve, reject) => {
                conn.query(query, values, (error, results, fields) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify("Status updated"));
                        }
                    });
                    resolve();
                });
            });
        } catch (error) {
            console.error(`Error updating status for message with ID ${id}:`, error);
        }
    }
};

app.post("/sheetdata", async (req, res) => {
    var ssid = req.body.ssid;
    var sheetindex = req.body.sheetindex;

    const doc = new GoogleSpreadsheet(ssid);

    await doc.useServiceAccountAuth({
        client_email: CREDENTIALS.client_email,
        private_key: CREDENTIALS.private_key,
    });

    await doc.loadInfo();
    var phones = new Array();
    var data = new Array();
    var colnames = new Array();
    var object = new Object();
    let sheet = doc.sheetsByIndex[sheetindex];
    try {
        let rows = await sheet.getRows();
        colnames.push(rows[0]._sheet.headerValues);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            data.push(row._rawData);
            phones.push(row.phone);
        }
        object["colnames"] = colnames;
        object["values"] = data;
        res.send(object);
    } catch (e) {
        console.log(e);
        res.send(status.nodatafound());
    }
});

app.post("/file", async (req, res) => {
    try {
        if (req.files && req.files.csvfile.mimetype === "text/csv") {
            let csvData = await req.files.csvfile.data.toString("utf8");
            return csvtojson()
                .fromString(csvData)
                .then((json) => {
                    return res.json({
                        csv: csvData,
                        json: json,
                    });
                });
        } else {
            return res.send(status.notAccepted());
        }
    } catch (error) {
        console.log(error);
    }
});

/*----------------------------------------------------------*/

// Channel : add contact to channel
app.post("/addcontact2channel", async (req, res) => {
    var apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            var contacts = req.body.contacts;
            var query = `insert into contact_channel values `;
            for (let i in contacts) {
                if (i != contacts.length - 1) {
                    query += `('${req.body.id}','${contacts[i]}','${apikey}','${req.body.iid}'),`;
                } else {
                    query += `('${req.body.id}','${contacts[i]}','${apikey}','${req.body.iid}');`;
                }
            }
            conn.query(query, (err, result) => {
                if (err || result.affectedRows <= 0)
                    return res.send(status.internalservererror());
                res.send(status.ok());
            });
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Channel : get contact of particular channel
app.post("/get-channel-contact", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const channel_id = req.body.channel_id;
            conn.query(
                `SELECT cc.channel_id,c.contact_id,c.name,ch.channelName,c.phone,c.email,c.disable FROM contact_channel cc, contact c, channel ch WHERE cc.channel_id = ch.channel_id AND cc.contact_id = c.contact_id and cc.apikey = '${apikey}' AND cc.channel_id = '${channel_id}' AND cc.instance_id = '${req.body.iid}' order by c.name asc`,
                (err, result) => {
                    if (err) return res.send(status.internalservererror());
                    if (result.length == 0) return res.send(status.nodatafound());
                    res.send(result);
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Channel : get contact of particular channel
app.post("/get-channel-active-contact", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const channel_id = req.body.channel_id;
            conn.query(
                `SELECT cc.channel_id,c.contact_id,c.name,ch.channelName,c.phone,c.email,c.disable FROM contact_channel cc, contact c, channel ch WHERE cc.channel_id = ch.channel_id AND cc.contact_id = c.contact_id and cc.apikey = '${apikey}' AND cc.channel_id = '${channel_id}' AND cc.instance_id = '${req.body.iid}'  AND c.disable = 0 order by c.name asc`,
                (err, result) => {
                    if (err) return res.send(status.internalservererror());
                    if (result.length == 0) return res.send(status.nodatafound());
                    res.send(result);
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Channel : Create | Add Channel
app.post("/createchannel", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const id = crypto.randomBytes(8).toString("hex");
            conn.query(
                `insert into channel values('${id}','${req.body.name}','${apikey}','${req.body.iid}')`,
                (err, result) => {
                    if (err || result.affectedRows <= 0)
                        return res.send(status.internalservererror());
                    res.send(status.created());
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Contact-list : add contact from sheet / csv
app.post("/importContactsFromGoogle", async (req, res) => {
    var apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);
    // const contentLength = req.headers['content-length'];
    // if (contentLength) {
    //     console.log('Payload size:', parseInt(contentLength), 'bytes');
    // }
    try {
        if (isValidapikey) {
            var clientarr = req.body.clients;
            var query = `insert into contact (contact_id,apikey,name,email,phone,instance_id) values`;
            for (var i in clientarr) {
                let id = crypto.randomBytes(8).toString("hex");
                if (i != clientarr.length - 1) {
                    query += `('${id}','${apikey}','${clientarr[i].name}','${clientarr[i].email
                        }','${clientarr[i].phone ? clientarr[i].phone : 0}','${req.body.iid
                        }'),`;
                } else {
                    query += `('${id}','${apikey}','${clientarr[i].name}','${clientarr[i].email
                        }','${clientarr[i].phone ? clientarr[i].phone : 0}','${req.body.iid
                        }')`;
                }
            }
            conn.query(query, (err, result) => {
                if (err || result.affectedRows <= 0)
                    return res.send(status.internalservererror());
                res.send(status.ok());
            });
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Contact-list : Add contact
app.post("/addcontact", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            let id = crypto.randomBytes(8).toString("hex");
            conn.query(`insert into contact (contact_id, apikey, name, email, phone, instance_id) values(?, ?, ?, ?, ?, ?)`,
                [id, apikey, req.body.name, req.body.email, req.body.phone, req.body.iid], (err, result) => {
                    if (err || result.affectedRows <= 0) return res.send(status.internalservererror());
                    res.send(status.ok());
                });
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

/*----------------------------------------------------------*/

let otp, token;
app.post("/sendEmailVerification", (req, res) => {
    const to = req.body.email;
    if (to) {
        otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
        token = jwt.sign(
            {
                otp,
                exp: Math.floor(Date.now() / 1000) + 59,
            },
            "ourSecretKey"
        );

        const subject = `Verification Email From SwiftSend | Communication Service`;
        const body = `<div class="u-row-container" style="padding: 0px;background-color: transparent"><div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"><div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;"><div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;"><div style="height: 100%;width: 100% !important;"><table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:40px 40px 30px;font-family:'Lato',sans-serif;" align="left"><div style="line-height: 140%; text-align: left; word-wrap: break-word;"><p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #666666;">Hello,</span></p><p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #666666;">OTP to Verify your Email : </span><span style="font-size: 22px; color: #405189;">${otp}</span></p></div></td></tr></tbody></table>`;

        conn.query(`SELECT * FROM users WHERE email='${to}'`, function (err, result) {
            if (err) return res.send(status.internalservererror());
            if (result.length > 0) return res.send(status.duplicateRecord());
            conn.query(`select * from company where isSet = 1`, function (err, result) {
                if (err || result.length <= 0) return res.send(status.internalservererror());
                if (result.length > 0) {
                    const sender = {
                        hostname: `${result[0].hostname}`,
                        port: `${result[0].portnumber}`,
                        email: `${result[0].c_email}`,
                        passcode: `${result[0].passcode}`,
                    };
                    sendEmail(sender, { to: to, bcc: "" }, subject, body)
                        .then(() => {
                            return res.send(status.ok());
                        })
                        .catch((error) => {
                            return res.send(status.badRequest());
                        });
                }
            });
        });
    } else {
        return res.send(status.notAccepted());
    }
});

app.post("/verifyOTP", (req, res) => {
    const receivedOTP = req.body.otp;
    if (receivedOTP == otp) {
        jwt.verify(token, "ourSecretKey", function (err, decoded) {
            if (err) return res.send(status.forbidden());
            if (decoded) {
                res.cookie("everify", true);
                return res.send(status.ok());
            }
        });
    } else {
        return res.send(status.unauthorized());
    }
});

app.post("/message_filter", async (req, res) => {
    apikey = req.cookies.apikey;
    let start_date = req.body.startdate;
    let end_date = req.body.enddate;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            conn.query(
                `SELECT m.instance_id AS iid, i.i_name AS i_name, 
            COUNT(CASE WHEN m.msg_type = 'Single Message' THEN 1 END) AS single_message_count, 
            COUNT(CASE WHEN m.msg_type like '%Document%' THEN 1 END) AS single_document_count, 
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Template' THEN 1 END) AS bulk_message_template_count,
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Custom' THEN 1 END) AS bulk_message_custom_count, 
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Channel' THEN 1 END) AS bulk_message_channel_count
            FROM message m JOIN instance i ON m.instance_id = i.instance_id AND m.time BETWEEN '${start_date}' AND '${end_date}' GROUP BY m.apikey, m.instance_id, i.i_name having apikey = '${apikey}'`,
                function (err, result) {
                    if (err) return res.send(status.internalservererror());
                    if (result.length <= 0) return res.send(status.nodatafound());
                    res.send(result);
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

app.get("/message_summary_admin", async (req, res) => {
    conn.query(
        `SELECT COUNT(CASE WHEN m.msg_type = 'Single Message' THEN 1 END) AS single_message_count, 
            COUNT(CASE WHEN m.msg_type like '%Document%' THEN 1 END) AS single_document_count, 
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Template' THEN 1 END) AS bulk_message_template_count,
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Custom' THEN 1 END) AS bulk_message_custom_count, 
            COUNT(CASE WHEN m.msg_type = 'Bulk Message Channel' THEN 1 END) AS bulk_message_channel_count
            FROM message m`,
        function (err, result) {
            if (err) return res.send(status.internalservererror());
            if (result.length <= 0) return res.send(status.nodatafound());
            res.send(result);
        }
    );
});

app.get("/get_phone_code", (req, res) => {
    var country_obj = country.getList();
    res.send(country_obj);
});

app.put("/updatepersonalinfo", async (req, res) => {
    apikey = req.cookies.apikey;

    let name = req.body.name;
    let email = req.body.email;
    let phone = req.body.phone;
    let country = req.body.country;
    let state = req.body.state;
    let city = req.body.city;

    var sql = ``;
    const isValidapikey = await checkAPIKey(apikey);

    try {
        if (isValidapikey) {
            conn.query(
                `SELECT * FROM users WHERE apikey = '${apikey}'`,
                function (err, result) {
                    if (err) return res.send(status.internalservererror());
                    if (result <= 0) return res.send(status.nodatafound());
                    if (result[0].phone != phone) {
                        sql = `UPDATE users SET uname = '${name}', phone = '${phone}', email = '${email}', country = '${country}', state = '${state}', city = '${city}', phoneverify = false WHERE apikey = '${apikey}'`;
                    } else {
                        sql = `UPDATE users SET uname = '${name}', phone = '${phone}', email = '${email}', country = '${country}', state = '${state}', city = '${city}' WHERE apikey = '${apikey}'`;
                    }
                    conn.query(sql, function (err, result) {
                        if (err || result.affectedRows <= 0)
                            return res.send(status.internalservererror());
                        if (result <= 0) return res.send(status.nodatafound());
                        res.send(status.ok());
                    });
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

app.put("/phoneverify", async (req, res) => {
    apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);

    try {
        if (isValidapikey) {
            conn.query(
                `UPDATE users SET phoneverify = true WHERE apikey = '${apikey}'`,
                function (err, result) {
                    if (err || result.affectedRows <= 0)
                        return res.send(status.internalservererror());
                    if (result <= 0) return res.send(status.nodatafound());
                    res.send(status.ok());
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

app.post("/profile_img", async (req, res) => {
    apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);

    try {
        if (isValidapikey) {
            createfolder(`/profile/${apikey}`);
            if (req.files && Object.keys(req.files).length !== 0) {
                const uploadedFile = req.files.img;
                const uploadPath = `${__dirname}/assets/upload/profile/${apikey}/${uploadedFile.name}`;

                uploadedFile.mv(uploadPath, function (err) {
                    if (err) return res.send(status.badRequest());
                    cloudinary.uploader
                        .upload(uploadPath, { folder: "SS" })
                        .then((data) => {
                            conn.query(
                                `UPDATE users SET image = '${data.secure_url}' WHERE apikey = '${apikey}'`,
                                function (err, result) {
                                    if (err || result.affectedRows <= 0)
                                        return res.send(status.internalservererror());
                                    deleteFolder(`/profile/${apikey}`);
                                    res.send(status.ok());
                                }
                            );
                        })
                        .catch((err) => {
                            console.log(
                                `error in storing Document on cloudnary :::::::`,
                                err
                            );
                        });
                });
            } else return res.send(status.nodatafound());
        } else return res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
    }
});

app.get("/userinfo", async (req, res) => {
    apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const data = {
                table: "users",
                paramstr: true,
                apikey: apikey,
            };
            tableData(data, (result) => {
                res.send(result);
            });
        } else res.send(status.internalservererror().status_code);
    } catch (e) {
        console.log(e);
    }
});

app.get("/get-landingpage-data", (req, res) => {
    try {
        conn.query(
            `SELECT COUNT(*) AS total FROM users UNION ALL SELECT COUNT(*) FROM instance UNION ALL SELECT COUNT(*) FROM message_info`,
            (err, result) => {
                if (err) return res.send(err);
                if (result.length > 0) {
                    res.send(result);
                }
            }
        );
    } catch (e) {
        console.log(e);
    }
});

app.get("/getPlans", function (req, res) {
    const data = {
        table: "plans",
        paramstr: "true; --",
    };
    tableData(data, (result) => {
        res.send(result);
    });
});

app.get("/dis_user", function (req, res) {
    const data = {
        table: "users",
        paramstr: "true --",
    };
    tableData(data, (result) => {
        res.send(result);
    });
});

app.post("/dis_mes", function (req, res) {
    let temp_name = req.body.temp_name;
    tableData(
        {
            table: "template",
            paramstr: `temp_name = '${temp_name}' --`,
            apikey: "null",
        },
        (result) => {
            switch (result.status_code) {
                case "500": {
                    res.send(status.internalservererror());
                    break;
                }
                case "404": {
                    tableData(
                        {
                            table: "cstm_template",
                            paramstr: `cstm_name = '${temp_name}'`,
                            apikey: req.cookies.apikey,
                        },
                        (result) => {
                            res.send(result);
                        }
                    );
                    break;
                }
                default: {
                    res.send(result);
                    break;
                }
            }
        }
    );
});

/*--------------------[ Common ]--------------------*/

// validate Instabce API
app.post("/validateInstance", (req, res) => {
    let iid = req.body.iid;
    let apikey = req.cookies.apikey;
    try {
        conn.query(`select * from instance where instance_id='${iid}'`, async (err, result) => {
            if (err) res.send(status.internalservererror());
            if (result.length == 1 && apikey == result[0].apikey) {
                const isValidapikey = await checkAPIKey(result[0].apikey);
                if (isValidapikey) {
                    tableData({
                        table: "subscription",
                        paramstr: true,
                        apikey: apikey,
                    }, (result) => {
                        if (result.status_code == 404) {
                            tableData({
                                table: "instance",
                                paramstr: true,
                                apikey: apikey,
                            }, (result) => {
                                if (result.status_code == 404) {
                                    res.send(status.ok());
                                }
                                else {
                                    res.send(status.forbidden());
                                }
                            });
                        }
                        else {
                            var latest = new Date(result[0].pay_date),
                                current_date = new Date();
                            var planID = result[0].planID;
                            let total_instance = 0,
                                duration = 0,
                                remaining_days = 0;
                            for (var i in result) {
                                if (latest < new Date(result[i].pay_date)) {
                                    latest = new Date(result[i].pay_date);
                                    planID = result[i].planID;
                                }
                            }

                            tableData({
                                table: "plans",
                                paramstr: `planid = ${planID} --`,
                                apikey: apikey,
                            }, (result) => {
                                total_instance = result[0].totalInstance;
                                duration = result[0].durationMonth;
                                latest.setMonth(latest.getMonth() + duration);
                                remaining_days = Math.ceil(Math.round(latest - current_date) / (1000 * 60 * 60 * 24));

                                if (remaining_days > 0) {
                                    tableData({
                                        table: "instance",
                                        paramstr: true,
                                        apikey: apikey,
                                    }, (result) => {
                                        if (result.length >= total_instance)
                                            return res.send(status.forbidden());
                                        res.send(status.ok());
                                    });
                                }
                                else {
                                    res.send(status.forbidden());
                                }
                            });
                        }
                    });
                }
                else res.send(status.unauthorized());
            }
            else {
                res.send(status.badRequest());
            }
        });
    } catch (error) {
        console.log(error);
        res.send(status.unauthorized(), error);
    }
});

// Common DISPLAY API
app.post("/getData", async (req, res) => {
    apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const data = {
                table: req.body.obj.table,
                paramstr: req.body.obj.paramstr,
                apikey: apikey,
            };
            tableData(data, (result) => {
                res.send(result);
            });
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Common UPDATE API
app.put("/updateData", (req, res) => {
    try {
        if (req.body.table == "users" && req.body.paramstr.includes("password")) {
            bcrypt.hash(req.body.paramstr.split("'")[1], 10, (err, hash) => {
                if (err) return res.send("err in bcrypt");
                conn.query(
                    `UPDATE ${req.body.table} SET password = '${hash}' WHERE ${req.body.condition}`,
                    (err, result) => {
                        if (err || result.affectedRows <= 0)
                            return res.send(status.internalservererror());
                        if (result <= 0) return res.send(status.nodatafound());
                        res.send(status.ok());
                    }
                );
            });
        } else {
            let sql = `UPDATE ${req.body.table} SET ${req.body.paramstr} WHERE ${req.body.condition}`;
            conn.query(sql, (err, result) => {
                if (err || result.affectedRows <= 0)
                    return res.send(status.internalservererror());
                if (result <= 0) return res.send(status.nodatafound());
                res.send(status.ok());
            });
        }
    } catch (e) {
        console.log(e);
    }
});

// Common DELETE API
app.delete("/deleterecord", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            conn.query(
                `DELETE FROM ${req.body.obj.table} WHERE ${req.body.obj.paramstr}`,
                (err, result) => {
                    if (err || result.affectedRows <= 0)
                        return res.send(status.internalservererror());
                    res.send(status.ok());
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

// Common instance wise page API
app.get(["/iuser/:id/:pagename", "/instance/:id/:pagename"], async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const data = {
                table: "instance",
                paramstr: `instance_id = '${req.params.id}' and disabled = false`,
                apikey: apikey,
            };
            tableData(data, (result) => {
                switch (result.status_code) {
                    case "404": {
                        res.sendFile(`${__dirname}/pages/blocked.html`);
                        break;
                    }
                    case "500": {
                        res.send(status.internalservererror());
                        break;
                    }
                    default: {
                        res.sendFile(`${__dirname}/pages/user/${req.params.pagename}.html`);
                    }
                }
            });
        } else res.sendFile(`${__dirname}/pages/404.html`);
    } catch (e) {
        console.log(e);
        res.sendFile(`${__dirname}/pages/404.html`);
    }
});

app.post("/getDataWithCondition", (req, res) => {
    conn.query(
        `select * from ${req.body.table} where ${req.body.paramstr}`,
        (err, result) => {
            if (err) res.send(status.internalservererror());
            if (result.length > 0) {
                res.send(result);
            } else {
                res.send(status.nodatafound());
            }
        }
    );
});

async function getAttachmentObject(attachments, apikey, iid) {
    return new Promise((resolve, reject) => {
        try {
            let fileobj = new Array(),
                attachments_size = 0;
            createfolder(`image_data/${apikey}/${iid}`);
            Promise.all(
                attachments.map((value, key) => {
                    attachments_size += attachments[key].size;
                    const uploadPath = `${__dirname}/assets/upload/image_data/${apikey}/${iid}/${attachments[key].name}`;

                    return new Promise((resolveMv, rejectMv) => {
                        attachments[key].mv(uploadPath, function (err) {
                            if (err) {
                                rejectMv(err);
                            } else {
                                fileobj.push({ path: uploadPath });
                                resolveMv();
                            }
                        });
                    });
                })
            )
                .then(() => {
                    resolve({ fileobj, attachments_size });
                })
                .catch((error) => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}

/*------------------------------------------------*/

app.post("/user", async (req, res) => {
    apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const data = {
                table: "instance",
                paramstr: `instance_id = '${req.body.iid}'`,
                apikey: apikey,
            };
            tableData(data, (result) => {
                res.send(result);
            });
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
    }
});

app.post("/resetpasswordmail", async (req, res) => {
    const email = req.body.email;
    const domain = process.argv[3] ? process.argv[3] : `localhost:8081`;
    const subject = `Reset password from SwiftSend | Communication Service`;
    const body = `<div class="u-row-container" style="padding: 0px;background-color: transparent"><div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"><div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;"><div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;"><div style="height: 100%;width: 100% !important;"><table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:40px 40px 30px;font-family:'Lato',sans-serif;" align="left"><div style="line-height: 140%; text-align: left; word-wrap: break-word;"><p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #666666;">Hello,</span></p><p style="font-size: 14px; line-height: 140%;">&nbsp;</p><p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #666666;">We have sent you this email in response to your request to reset your password on company name.</span></p><p style="font-size: 14px; line-height: 140%;">&nbsp;</p><p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #666666;">To reset your password, please follow the link below:</span></p></div></td></tr></tbody></table><table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0px 40px;font-family:'Lato',sans-serif;" align="left"><div align="left"><a href="${domain}/password-change" target="_blank" class="v-button" style="box-sizing: border-box;display: inline-block;font-family:'Lato',sans-serif;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #FFFFFF; background-color: #18163a; border-radius: 1px;-webkit-border-radius: 1px; -moz-border-radius: 1px; width:auto; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;font-size: 14px;"><span style="display:block;padding:15px 40px;line-height:120%;"><span style="font-size: 18px; line-height: 21.6px;">Reset Password</span></span></a></div></td></tr></tbody></table>
            <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:40px 40px 30px;font-family:'Lato',sans-serif;" align="left"></td></tr></tbody></table></div></div></div></div></div>`;
    if (email) {
        const data = {
            table: "users",
            paramstr: `email = '${email}' --`,
            apikey: "null",
        };
        tableData(data, async (result) => {
            console.log(result);
            let flag = false;
            for (let i in result) {
                if (email == result[i].email) {
                    flag = true;
                    break;
                } else {
                    flag = false;
                }
            }
            if (!flag) return res.send(status.nodatafound());
            conn.query(`select * from company where isSet = 1`, function (err, result) {
                if (err || result.length <= 0)
                    return res.send(status.internalservererror());
                if (result.length > 0) {
                    const sender = {
                        hostname: `${result[0].hostname}`,
                        port: `${result[0].portnumber}`,
                        email: `${result[0].c_email}`,
                        passcode: `${result[0].passcode}`,
                    };
                    sendEmail(sender, { to: email, bcc: "" }, subject, body)
                        .then(() => {
                            return res.send(status.ok());
                        })
                        .catch((error) => {
                            return res.send(status.badRequest());
                        });
                }
            });
        });
    }
});

app.post("/create/orderId", (req, res) => {
    let amount = req.body.amount;
    var options = {
        amount: amount,
        currency: "INR",
        receipt: "order_rcptid_i5",
    };
    instance.orders.create(options, function (err, order) {
        res.send({ orderId: order.id });
    });
});

app.post("/api/payment/verify", (req, res) => {
    let body = `${req.body.response.razorpay_order_id}|${req.body.response.razorpay_payment_id}`;

    var expectedSignature = crypto
        .createHmac("sha256", "CGgkDqWQn8f2Sp6vNwqftaXO")
        .update(body.toString())
        .digest("hex");
    var response = { signatureIsValid: "false" };
    if (expectedSignature === req.body.response.razorpay_signature) {
        response = { signatureIsValid: "true" };
    }
    res.send(response);
});

app.post("/recordPayment", function (req, res) {
    let subID = crypto.randomBytes(10).toString("hex");
    let planID = req.body.planID;
    let amount = req.body.amount / 100;
    let apikey = req.body.apikey;
    let payID = req.body.payID;
    let orderId = req.body.orderID;

    conn.query(
        `insert into subscription values('${subID}','${planID}',${amount},'${apikey}','${payID}','${orderId}',CURRENT_DATE)`,
        (err, result) => {
            if (err) return res.send(status.internalservererror());
            res.send(status.ok());
        }
    );
});

app.post("/checkoldpwd", async function (req, res) {
    apikey = req.cookies.apikey;
    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            tableData(
                {
                    table: "users",
                    paramstr: true,
                    apikey: apikey,
                },
                (result) => {
                    bcrypt.compare(req.body.oldpwd, result[0].password, (err, match) => {
                        if (match) {
                            return res.send(status.ok());
                        } else {
                            return res.send(status.notAccepted());
                        }
                    });
                }
            );
        } else res.send(status.unauthorized());
    } catch (e) {
        console.log(e);
        res.send(status.unauthorized());
    }
});

app.post("/updatePasscode", (req, res) => {
    let query = ``;
    if (req.body.emailtype == "gmail") {
        query = "update users set emailpasscode='" + passcode + "' where apikey='" + req.cookies.apikey + "'";
    }
    else {
        query = `update users set emailpasscode=' ${passcode}',hostname='${req.body.hostname}',port=${req.body.port} where apikey='${req.cookies.apikey}'`;
    }
    conn.query(query, (err, result) => {
        if (err) return res.send(status.internalservererror());
        if (result.affectedRows == 1) {
            res.send(status.ok());
        } else {
            res.send(status.internalservererror());
        }
    });
});

// admin apis->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

app.post("/getDataByPage", (req, res) => {
    var limit = req.body.limit;
    var offset = (req.body.pgno - 1) * limit;
    var table = req.body.table;

    if (table == "users") {
        conn.query(
            `SELECT apikey,uname,email,phone,phoneverify,country,state,city,registrationDate,image FROM users LIMIT ${offset},${limit};`,
            (err, results) => {
                //console.log(results);
                res.send(results);
            }
        );
    } else {
        conn.query(
            `SELECT * FROM ${table} LIMIT ${offset},${limit};`,
            (err, results) => {
                res.send(results);
            }
        );
    }
});

app.post("/getBtn", (req, res) => {
    var limit = req.body.limit;
    var table = req.body.table;
    var offset = (req.body.pgno - 1) * limit;
    conn.query(
        `SELECT count(*) as cnt FROM ${table} WHERE ${req.body.paramstr}`,
        (err, results) => {
            var totalBtn = results[0].cnt / limit;
            res.send({ totalBtn: Math.ceil(totalBtn) });
        }
    );
});

app.post("/adminSearchRecord", async (req, res) => {
    let limit = req.body.limit;
    try {
        const data = {
            table: req.body.table,
            paramstr: req.body.paramstr,
            limit: limit,
            offset: (req.body.pgno - 1) * limit,
        };
        tableDataAdmin(data, (result) => {
            res.send(result);
        });
    } catch (e) {
        //console.log(e);
    }
});

app.post("/addRecord", function (req, res) {
    let table = req.body.table;
    if (table == "company") {
        const id = crypto.randomBytes(8).toString("hex");
        conn.query(
            `insert into company(company_id,c_name,c_email,hostname,portnumber,passcode) values('${id}','${req.body.c_name}','${req.body.c_email}','${req.body.hostname}',${req.body.portnumber},'${req.body.passcode}')`,
            (err, result) => {
                console.log("Result:", result);
                if (err) return res.send(status.internalservererror());
                if (result.affectedRows == 1) {
                    res.send(status.ok());
                } else {
                    res.send(status.internalservererror());
                }
            }
        );
    } else if (table == "plans") {
        conn.query(
            `insert into plans(pname,price,durationMonth,totalInstance,totalMessage,discount,plan_type) values('${req.body.pname}',${req.body.price},${req.body.duration},${req.body.instances},${req.body.messages},${req.body.discount},'${req.body.type}')`,
            (err, result) => {
                if (err) return res.send(status.internalservererror());
                if (result.affectedRows == 1) {
                    res.send(status.ok());
                } else {
                    res.send(status.internalservererror());
                }
            }
        );
    } else if (table == "template") {
        conn.query(
            `insert into template(temp_name,temp_message,userfields) values('${req.body.tname}','${req.body.message}',${req.body.userfields})`,
            (err, result) => {
                if (err) return res.send(status.internalservererror());
                if (result.affectedRows == 1) {
                    res.send(status.ok());
                } else {
                    res.send(status.internalservererror());
                }
            }
        );
    } else if (table == "support_agents") {
        const id = crypto.randomBytes(8).toString("hex");
        bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) return res.send("err in bcrypt");
            conn.query(
                `insert into support_agents values(?,?,?,?,?)`,
                [id, req.body.aname, req.body.email, hash, req.body.category],
                (err, result) => {
                    if (err) return res.send(status.internalservererror());
                    if (result.affectedRows == 1) {
                        res.send(status.ok());
                    } else {
                        res.send(status.internalservererror());
                    }
                }
            );
        });
    }
});

app.post("/adminDeleteRecord", (req, res) => {
    conn.query(
        `delete from ${req.body.table} where ${req.body.column}='${req.body.id}'`,
        (err, result) => {
            if (err) return res.send(status.internalservererror());
            if (result.affectedRows == 1) {
                res.send(status.ok());
            } else {
                res.send(status.expectationFailed());
            }
        }
    );
});

app.get("/chartsupportticket", (req, res) => {
    (AM_count = 0), (TS_count = 0), (PP_count = 0), (SI_count = 0), (F_count = 0);
    conn.query("SELECT t_type,ticket_id FROM support_ticket", (err, result) => {
        if (err) return console.log(err);
        if (result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                if (result[i].t_type == "Account Management") {
                    AM_count++;
                } else if (result[i].t_type == "Technical Support") {
                    TS_count++;
                } else if (result[i].t_type == "Payment Problem") {
                    PP_count++;
                } else if (result[i].t_type == "Service Inquiry") {
                    SI_count++;
                } else if (result[i].t_type == "Feedback and Suggestions") {
                    F_count++;
                }
            }
            var obj = {
                AM: AM_count,
                TS: TS_count,
                PP: PP_count,
                SI: SI_count,
                F: F_count,
            };
            res.send(obj);
        }
    });
});

// ----------------------------------------------------------

app.post("/card", function (req, res) {
    var table = req.body.table;
    var paramstr = req.body.paramstr;
    conn.query(
        `select count(*) as cnt from ${table} where ${paramstr}`,
        (err, result) => {
            if (err) return res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

app.post("/distinct", function (req, res) {
    var column = req.body.column;
    var table = req.body.table;
    conn.query(
        `select country, count(apikey) as cnt from ${table} group by country`,
        (err, result) => {
            if (err) return res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

app.post("/monthlyreport", function (req, res) {
    let month = req.body.month;
    let year = req.body.year;
    conn.query(
        `SELECT count(*) as cnt FROM users WHERE MONTH(registrationDate) = ${month} AND YEAR(registrationDate)=${year}`,
        (err, result) => {
            if (err) return res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

app.post("/instancereport", function (req, res) {
    let month = req.body.month;
    let year = req.body.year;
    conn.query(
        `SELECT count(*) as cnt FROM instance WHERE MONTH(create_date) = ${month} AND YEAR(create_date)=${year}`,
        (err, result) => {
            if (err) return res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

//user wise plan subscription
app.get("/usersubscription", (req, res) => {
    conn.query("SELECT planID, count(*) as cnt from subscription GROUP BY planID",
        (err, result) => {
            if (err) return res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

//attachment handle function support-ticket
async function getSupportTicketAttachmentObj(attachments, apikey) {
    return new Promise((resolve, reject) => {
        try {
            let fileobj = new Array(),
                attachments_size = 0;
            createfolder(`support-ticket_doc_data/${apikey}`);
            Promise.all(
                attachments.map((value, key) => {
                    attachments_size += attachments[key].size;
                    const uploadPath = `${__dirname}/assets/upload/support-ticket_doc_data/${apikey}/${attachments[key].name}`;

                    return new Promise((resolveMv, rejectMv) => {
                        attachments[key].mv(uploadPath, function (err) {
                            if (err) {
                                rejectMv(err);
                            } else {
                                fileobj.push({ path: uploadPath });
                                resolveMv();
                            }
                        });
                    });
                })
            )
                .then(() => {
                    resolve({ fileobj, attachments_size });
                })
                .catch((error) => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}

app.post("/addticket", async (req, res) => {
    let apikey = req.cookies.apikey;

    const isValidapikey = await checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            const iid = req.body.iid;
            const generateUniqueId = () => {
                const prefix = "ST-";
                const maxLength = 7 - prefix.length;
                const maxNumber = Math.pow(10, maxLength) - 1;
                const uniqueId = Math.floor(Math.random() * maxNumber) + 1;
                return prefix + uniqueId.toString().padStart(maxLength, "0");
            };
            const t_id = generateUniqueId();

            let email = await findData(apikey, "email");
            let subject = req.body.subject;
            let t_type = req.body.t_type;
            let description = req.body.description;
            let attachments = req.files
                ? Array.isArray(req.files.attachments)
                    ? req.files.attachments
                    : [req.files.attachments]
                : [];

            let agents = new Array();
            let Account_Management = new Array();
            let Technical_Support = new Array();
            let Payment_Problem = new Array();
            let Service_Inquiry = new Array();
            let Feedback = new Array();

            conn.query(`select * from support_agents`, (err, result) => {
                if (err || result.length <= 0) res.send(status.internalservererror());
                for (let i = 0; i < result.length; i++) {
                    agents.push(result[i].email);
                    if (result[i].category == "Account Management") {
                        Account_Management.push(result[i].email);
                    } else if (result[i].category == "Technical Support") {
                        Technical_Support.push(result[i].email);
                    } else if (result[i].category == "Payment Problem") {
                        Payment_Problem.push(result[i].email);
                    } else if (result[i].category == "Service Inquiry") {
                        Service_Inquiry.push(result[i].email);
                    } else if (result[i].category == "Feedback and Suggestions") {
                        Feedback.push(result[i].email);
                    }
                }
                let categories = {
                    "Account Management": Account_Management,
                    "Technical Support": Technical_Support,
                    "Payment Problem": Payment_Problem,
                    "Service Inquiry": Service_Inquiry,
                    "Feedback and Suggestions": Feedback,
                };
                const agentsInCategory = categories[t_type];
                const assignedAgent =
                    agentsInCategory[Math.floor(Math.random() * agentsInCategory.length)];

                getSupportTicketAttachmentObj(attachments, apikey).then(
                    ({ fileobj, attachments_size }) => {
                        conn.query(
                            `INSERT INTO support_ticket VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
                            [
                                t_id,
                                `email`,
                                email,
                                subject,
                                t_type,
                                description,
                                "",
                                `open`,
                                new Date(),
                                apikey,
                                assignedAgent,
                            ],
                            async (err, resp) => {
                                if (err) return res.send(status.internalservererror());
                                //mail to support person for support ticket assigning
                                conn.query(`select * from company where isSet = 1`, function (err, result) {
                                    if (err || result.length <= 0)
                                        return res.send(status.internalservererror());
                                    if (result.length > 0) {
                                        const sender = {
                                            hostname: `${result[0].hostname}`,
                                            port: `${result[0].portnumber}`,
                                            email: `${result[0].c_email}`,
                                            passcode: `${result[0].passcode}`,
                                        };

                                        const agent_body = `<body style="background-color: #f4f4f4;">
                                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                            <p style="color: #555; font-size: 16px; line-height: 1.5;">Dear ${assignedAgent},</p>
                                            <p style="color: #555; font-size: 14px; line-height: 1.5;">A new ticket has been assigned to you. Here are the details:</p>
                                            <ul style="margin: 10px 0; padding: 0; list-style: none;">
                                            <li style="margin-bottom: 5px;">
                                            <strong style="color: #333;">Ticket ID : ${t_id}</strong> 
                                            </li>
                                            </ul>
                                            <p style="color: #555; font-size: 14px; line-height: 1.5;">Please login to  review the ticket and take necessary action accordingly.</p>
                                            <p style="color: #555; font-size: 14px; line-height: 1.5;">Thank you for your attention.</p>
                                            <p style="margin-top: 20px; font-size: 16px; color: #777;">Sincerely,<br>
                                            <b>SwiftSend</b>
                                            </div>
                                            </body>`;

                                        const user_body = `<body>
                                            <p>Dear Customer,</p>
                                            <p>Thank you for reaching out to us. We have received your ticket and it is currently being reviewed by our support team. Here are the details:</p>
                                            <ul style="margin: 10px 0; padding: 0; list-style: none;">
                                            <li style="margin-bottom: 5px;">
                                            <strong style="color: #333;">Ticket ID : ${t_id}</strong> 
                                            </li>
                                            </ul>
                                            <p>We understand the importance of your inquiry and will make every effort to provide you with a timely response. Please note that our support team may require additional information or clarification to assist you further. We kindly request your patience during this process.</p>
                                            <p>Thank you for choosing our services. We appreciate your patience and look forward to resolving your issue.</p>
                                            <p>Sincerely,</p>
                                            <b>SwiftSend Support Team</b>
                                            </body>`;

                                        if (attachments_size <= 10000000) {
                                            sendEmail(
                                                sender,
                                                { to: assignedAgent, bcc: "" },
                                                `New Ticket assigned`,
                                                agent_body,
                                                fileobj
                                            )
                                                .then(() => {
                                                    sendEmail(
                                                        sender,
                                                        { to: email, bcc: "" },
                                                        `Ticket Acknowledgement | SwiftSend`,
                                                        user_body
                                                    )
                                                        .then(() => {
                                                            return res.send(status.ok());
                                                        })
                                                        .catch((error) => {
                                                            // console.log(`error in Sending  E-Mail ::::::: <${error}>`);
                                                            return res.send(status.badRequest());
                                                        });
                                                })
                                                .catch((error) => {
                                                    // console.log(`error in Sending  E-Mail ::::::: <${error}>`);
                                                    return res.send(status.badRequest());
                                                })
                                                .finally(() => {
                                                    deleteFolder(`/support-ticket_doc_data/${apikey}`);
                                                });
                                        } else {
                                            console.log("Total file size exceeds the limit (10 MB)");
                                            logAPI("/email", apikey, iid, requestBody, "E");
                                            return res.status(401).send({
                                                code: "401",
                                                message: "Total file size exceeds the limit (10 MB)",
                                            });
                                        }
                                    }
                                });
                            }
                        );
                    }
                );
            });
        } else res.send(status.unauthorized());
    } catch (e) {
        //console.log(e);
        res.send(status.unauthorized());
    }
});

app.post("/getTickets", (req, res) => {
    try {
        const data = {
            table: req.body.obj.table,
            paramstr: req.body.obj.paramstr,
        };
        tableData(data, (result) => {
            res.send(result);
        });
    } catch (e) {
        console.log(e);
    }
});

app.post("/AgentReplyToTicket", async (req, res) => {
    let agent_id = req.cookies.apikey;
    let id = req.body.id;
    let indexno = req.body.indexno;
    let identity = req.body.identity;
    let category = req.body.category;
    let description = req.body.description;
    let uname = req.body.uname;
    let contact = req.body.contact;
    let response = req.body.response;
    const chatId = `91${contact}@c.us`;

    conn.query(`select * from company where isSet = 1`, async function (err, result) {
        if (err || result.length <= 0)
            return res.send(status.internalservererror());
        if (result.length > 0) {
            const sender = {
                hostname: `${result[0].hostname}`,
                port: `${result[0].portnumber}`,
                email: `${result[0].c_email}`,
                passcode: `${result[0].passcode}`,
            };

            const to = req.body.email;
            const subject = `Reply of your Ticket ${id}`;
            const body = `<div>
                    <b>Hello ${uname}</b><br>
                    Your Query : #${id} ${subject}<br>
                    ${description}<br>
                    Answer: <b>${response}</b>
                </div>`;

            switch (category) {
                case "whatsapp": {
                    await obj[agent_id].send_whatsapp_message(
                        chatId,
                        `Hello ${uname}\n\nFor query #${id} \n\nWe have considered your query and send response on your email: ${to}\n\nPlease check your email or login to SwiftSend to view the reply`
                    );
                    sendEmail(sender, { to: to, bcc: "" }, subject, body)
                        .then(() => {
                            conn.query(
                                `INSERT INTO ticket_reply VALUES (?,?,?,?,?,?)`,
                                [indexno, identity, id, response, new Date(), agent_id],
                                (err, result) => {
                                    if (err) return res.send(status.internalservererror());
                                    conn.query(
                                        `update support_ticket set status='inprogress' where ticket_id='${id}'`,
                                        (err2, result2) => {
                                            if (err2 || result2.affectedRows <= 0)
                                                return res.send(status.internalservererror());
                                            res.send(status.ok());
                                        }
                                    );
                                }
                            );
                        })
                        .catch((error) => {
                            return console.log(`error in Sending  E-Mail ::::::: <${error}>`);
                        });
                    break;
                }

                case "email": {
                    sendEmail(sender, { to: to, bcc: "" }, subject, body)
                        .then(() => {
                            conn.query(
                                `INSERT INTO ticket_reply VALUES (?,?,?,?,?,?)`,
                                [indexno, identity, id, response, new Date(), agent_id],
                                (err, result) => {
                                    if (err) return res.send(status.internalservererror());
                                    conn.query(
                                        `update support_ticket set status='inprogress' where ticket_id='${id}'`,
                                        (err2, result2) => {
                                            if (err2 || result2.affectedRows <= 0)
                                                return res.send(status.internalservererror());
                                            res.send(status.ok());
                                        }
                                    );
                                }
                            );
                        })
                        .catch((error) => {
                            return console.log(`error in Sending  E-Mail ::::::: <${error}>`);
                        });
                    break;
                }
            }
        }
    });
});

app.post("/ClientReplyToTicketAgent", async (req, res) => {
    apikey = req.cookies.apikey;
    let id = req.body.id;
    let indexno = req.body.indexno;
    let identity = req.body.identity;
    let contact = req.body.contact;
    let response = req.body.response;
    let agent_email = req.body.agent_email;
    let prefix = "+91";
    contact = prefix.concat(contact);

    const to = agent_email;
    const subject = `Support-Ticket ${id}`;
    const body = `<div><b>Hello ${agent_email},</b><br><br>Ticket-Id: #${id}<br><br>subject: ${subject}<br><br>description:${response}</div>`;

    const sender = {
        hostname: await findData(apikey, "hostname"),
        port: await findData(apikey, "port"),
        email: await findData(apikey, "email"),
        passcode: await findData(apikey, "emailpasscode"),
    };

    sendEmail(sender, { to: to, bcc: "" }, subject, body)
        .then(() => {
            conn.query(
                `INSERT INTO ticket_reply VALUES (?,?,?,?,?,?)`,
                [indexno, identity, id, response, new Date(), apikey],
                (err, result) => {
                    if (err) return res.send(status.internalservererror());
                    conn.query(
                        `update support_ticket set status='inprogress' where ticket_id='${id}'`,
                        (err2, result2) => {
                            if (err2 || result2.affectedRows <= 0)
                                return res.send(status.internalservererror());
                            res.send(status.ok());
                        }
                    );
                }
            );
        })
        .catch((error) => {
            return console.log(`error in Sending  E-Mail ::::::: <${error}>`);
        });
});

app.post("/getAdminData", function (req, res) {
    conn.query(`select * from ${req.body.table}`, (err, result) => {
        if (err) return res.send(status.internalservererror());
        res.send(result);
    });
});

//log display
app.get("/user/api/log/:iid", (req, res) => {
    apikey = req.headers.apikey || req.cookies.apikey;
    const isValidapikey = checkAPIKey(apikey);
    try {
        if (isValidapikey) {
            let iid = req.params.iid;

            var query = `select * from log where apikey='${apikey}'and instance_id='${iid}'`;

            if (req.query.type && req.query.type != "null") {
                query += ` AND type = '${req.query.type}'`;
            }

            if (req.query.api && req.query.api != "null") {
                query += ` AND api = '/${req.query.api}'`;
            }

            query += `ORDER BY logtime DESC`;

            conn.query(query,
                function (err, ret) {
                    if (err || ret.length < 0) return res.send(status.nodatafound());
                    res.send(ret);
                }
            )
        }
    } catch {
        res.status(404).send({
            "Error Code": "404",
            "Message": "Apikey is Invalid"
        });
    }
});

app.get("/ticket_users", (req, res) => {
    conn.query(
        `SELECT distinct s.apikey,u.uname FROM support_ticket s,users u where s.apikey=u.apikey`,
        (err, result) => {
            if (err) res.send(err);
            if (result.length > 0) {
                res.send(result);
            }
        }
    );
});

app.use((req, res) => {
    res.status(404).sendFile(`${__dirname}/pages/404.html`);
});

server.listen(port, () => {
    console.log(`📅 : \x1b[1m\x1b[2m${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }).toUpperCase().split(',')[0]}\x1b[0m`);
    console.log(`⏱️  : \x1b[1m\x1b[2m${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }).toUpperCase().split(',')[1].trim()}\x1b[0m`);
    console.log(`🛠️  :\x1b[32mYour server is up and running on\x1b[0m \x1b[35m${port}\x1b[0m`);
    console.log(`🌐 : \x1b[33mhttp://localhost:${port}/signin\x1b[0m`);
    console.log(`⚡ : \x1b[34mhttps://swift-send.click\x1b[0m`);
});
