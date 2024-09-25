const axios = require("axios");
const crypto = require("crypto");
const conn = require('../DB/connection');
const logAPI = require("../function/log");
const { setWabaCred } = require("./userController");

const insertIntoMessageInfo = async (data) => {
    const query = `INSERT INTO message_info (waba_message_id, boardCast_id , reciver_number, message_type, status) VALUES ?`;

    const values = data.map((item) => [
        item.waba_message_id,
        item.boardcast_id,
        item.reciver_number,
        item.message_type,
        item.status,
    ]);

    return new Promise((resolve, reject) => {
        conn.query(query, [values], (error, results, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
};

const insertIntoBoardCaste = async (apikey, templateName, boardcast_id, iid) => {
    const query = `INSERT INTO boardcast (boardcast_id, apikey, template_id, time, instance_id) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`;
    const values = [boardcast_id, apikey, templateName, iid];

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

const sendBulkMessagesIn = async (req, res) => {
    const version = "v19.0";

    try {
        const apiKey = req.cookies.apikey;
        const { numberList, templateName, components, languageCode, iid } = req.body;

        const wabaCred = await setWabaCred(apiKey, iid);

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

        const apikey = req.cookies.apikey;
        const boardCastId = crypto.randomBytes(16).toString("hex");
        let success = true;

        const filteredComponents = components ? components.filter((component) => component !== null) : [];
        const messageInfoData = [];

        await Promise.all(
            numberList.map(async (item) => {
                const payload = {
                    messaging_product: "whatsapp",
                    to: item,
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
                    const response = await axios.post(`https://graph.facebook.com/${version}/${phoneID}/messages`, payload, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status !== 200) {
                        success = false;
                    } else {
                        success = true;

                        const myData = response.data;
                        const messageId = myData.messages[0].id;
                        messageInfoData.push({
                            waba_message_id: messageId,
                            boardcast_id: boardCastId,
                            user_id: 1,
                            reciver_number: item,
                            message_type: "template",
                            status: "sent",
                        });
                    }
                }
                catch (error) {
                    console.log("error ", error.response);
                    success = false;
                }
            })
        );

        if (success) {
            await insertIntoBoardCaste(apikey, templateName, boardCastId, iid);

            // Bulk insertion into message_info table
            await insertIntoMessageInfo(messageInfoData);

            logAPI(req.url, apikey, iid, "S");
            res.status(200).json({ success: true, message: "Messages sent successfully" });
        } else {
            logAPI(req.url, apikey, iid, "E");
            return res.status(500).json({
                success: false,
                message: "Failed to send one or more messages",
            });
        }
    } catch (error) {
        console.log("error", error);
        logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the messages",
        });
    }
};

module.exports = { sendBulkMessagesIn };
