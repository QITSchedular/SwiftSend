const axios = require("axios");
const crypto = require("crypto");
const conn = require('../DB/connection');
const logAPI = require("../function/log");
const { setWabaCred } = require("./userController");
//Credentials


// Function to insert data into single_message table
const insertIntoSingleMessage = async (apikey, templateName, Single_id, iid) => {
    const query = `INSERT INTO single_message (single_id, apikey, template_name, time, instance_id, fromapp) VALUES (?, ?, ?, CURRENT_TIMESTAMP,?,?)`;
    const values = [Single_id, apikey, templateName, iid, true];

    return new Promise((resolve, reject) => {
        conn.query(query, values, (error, results, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results.insertId);
        });
    });
};

// Function to insert data into message_info table
const insertIntoMessageInfo = async (data) => {
    const query = `INSERT INTO message_info (waba_message_id, single_id, reciver_number, message_type, status) VALUES (?, ?, ?, ?, ?)`;
    const values = [
        data.waba_message_id,
        data.single_id,
        data.reciver_number,
        data.message_type,
        data.status
    ];

    return new Promise((resolve, reject) => {
        conn.query(query, values, (error, results, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
};

const sendSimpleTextTemplate = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;

        const { to, templateName, components, languageCode, iid } = req.body;
        const wabaCred = await setWabaCred(apikey, iid);

        if (wabaCred.length <= 0) {
            return res.status(404).json({
                success: false,
                message: "An error occurred while fetching templates",
                detail: "Instance not found"
            });
        }

        const token = wabaCred[0].permanentToken;
        const wabaId = wabaCred[0].wabaID;
        const phoneID = wabaCred[0].phoneID;
        const appID = wabaCred[0].appID;


        const Single_id = crypto.randomBytes(16).toString("hex");

        const filteredComponents = components ? components.filter((component) => component !== null) : [];

        const payload = {
            messaging_product: "whatsapp",
            to: to,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: languageCode,
                },
                components: filteredComponents,
            },
        };

        try {
            const response = await axios.post(`https://graph.facebook.com/v18.0/${phoneID}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            // console.log("A : ", response.data)

            if (response.status === 200) {
                const singleMessageId = await insertIntoSingleMessage(apikey, templateName, Single_id, iid);

                const myData = response.data;
                const messageId = myData.messages[0].id;
                const messageTypeInfo = {
                    waba_message_id: messageId,
                    single_id: Single_id,
                    apikey: apikey,
                    reciver_number: to,
                    message_type: "single",
                    status: "sent",
                };

                await insertIntoMessageInfo(messageTypeInfo);

                logAPI(req.url, apikey, iid, "S");
                return res.status(200).json({ success: true, message: "Message sent successfully" });
            } else {
                logAPI(req.url, apikey, iid, "E");
                return res.status(417).json({ success: false, message: "Failed to send message" });
            }
        } catch (error) {
            console.log("error ", error);
            logAPI(req.url, apikey, iid, "E");
            return res.status(417).json({
                success: false,
                message: error,
            });
        }
    } catch (error) {
        console.log("error", error);
        logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the message",
        });
    }
};

module.exports = { sendSimpleTextTemplate };
