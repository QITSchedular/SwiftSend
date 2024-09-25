const axios = require("axios");
const crypto = require("crypto");
const conn = require('../../DB/connection');
const logAPI = require("../../function/log");

const { getTemplateById } = require("./templateController");
const { setWabaCred } = require("../../controllers/userController");

// Function to insert data into single_message table
const insertIntoSingleMessage = async (apikey, templateName, Single_id, iid) => {
    const query = `INSERT INTO single_message (single_id, apikey, template_name, time, instance_id) VALUES (?, ?, ?, CURRENT_TIMESTAMP,?)`;
    const values = [Single_id, apikey, templateName, iid];

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
        data.status,
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

// Tansfrom Data
const transformResponseData = (data) => {
    // console.log("transform : ", data);
    const transformedData = {
        templateName: data.name,
        language: data.language,
        Header: [],
        body: [],
    };
    let objTemp = {
        templateName: data.name,
        language: data.language,
        header: [],
        body: [],
    };

    data.components.forEach((item) => {

        switch (item.type) {
            case "HEADER":
                // console.log("This is HEADER");
                switch (item.format) {
                    case "TEXT":
                        if (item.example) {
                            objTemp.header.push(item.example.header_text[0]);
                            break;
                        }
                        break;
                    case "IMAGE":
                        // console.log("This is an TEXT. ", item);
                        // console.log("This is a IMAGE.");
                        objTemp.header.push("Image");

                        break;
                    case "DOCUMENT":
                        //console.log("This is a DOCUMENT.");
                        break;
                    default:
                    // console.log("Unknown citrus fruit.");
                }
                break;
            case "BODY":
                if (item.example) {
                    var bodyLength = item.example.body_text[0].length;

                    for (var i = 0; i < bodyLength; i++) {
                        objTemp.body.push(item.example.body_text[0][i]);
                    }
                }

                break;
            case "FOOTER":
                // console.log("This is an FOOTER.");
                break;
            default:
                console.log("Unknown fruit.");
        }
    });

    return objTemp;
};

//component section
const createComponentPart = (data, paylodReq) => {
    const reqBody = data.body;
    const { to, templateId, header, body, image } = paylodReq;

    let Component = [
        {
            type: "header",
            parameters: [
                {
                    type: "image",
                    image: {
                        link: "http(s)://the-image-url",
                    },
                },
            ],
        },
        {
            type: "body",
            parameters: [
                {
                    type: "text",
                    text: "text-string",
                },
            ],
        },
    ];

    let components = [];

    Component.forEach((item) => {
        //console.log("item = > ", item.type);
        const compoType = item.type;

        switch (compoType) {
            case "header":
                var headercompo = {
                    type: "header",
                    parameters: [],
                };
                // console.log("header here = > ",);
                headerType = data.header[0];

                if (headerType === "Image") {
                    var obj = {
                        type: "image",
                        image: {
                            id: paylodReq.image,
                        },
                    };
                    // console.log("Header ", obj);
                    headercompo.parameters.push(obj);
                }
                else {
                    if (paylodReq.header) {
                        var obj = {
                            type: "text",
                            text: paylodReq.header ? paylodReq.header[0] : null,
                        };
                        headercompo.parameters.push(obj);
                    }
                }

                components.push(headercompo);

                break;
            case "body":
                bodyParmsLength = data.body.length;
                var bodyObj = {
                    type: "body",
                    parameters: [],
                };
                //console.log("This is an BODY count .", bodyParmsLength);
                for (var i = 0; i < bodyParmsLength; i++) {
                    // console.log("body => ", paylodReq.body[i]);
                    var bodyParamObj = {
                        type: "text",
                        text: paylodReq.body[i],
                    };

                    // console.log(bodyParamObj);
                    bodyObj.parameters.push(bodyParamObj);
                }
                // console.log("body : ", bodyObj);
                components.push(bodyObj);
                break;
            default:
                console.log("Unknown fruit.");
        }
    });
    console.log("A : ", components)
    return components;
};

// Send Message
const sendMessage = async (req, res) => {
    const apikey = req.body.apikey || req.cookies.apikey;
    const iid = req.body.iid;

    try {
        const { to, templateId, header, body, image } = req.body;
        const payloadReq = req.body;

        const wabaCred = await setWabaCred(apikey, iid);

        if (wabaCred.length <= 0) {
            logAPI(req.url, apikey, iid, "E");
            return res.status(404).json({
                success: false,
                message: "An error occurred while fetching templates",
                detail: "Instance not found"
            });
        }

        const token = wabaCred[0].permanentToken;
        const phoneID = wabaCred[0].phoneID;

        const result = await getTemplateById(templateId, token);
        const headertype = result.components[0].format;
        // console.log("result.components : ", result.components)

        if (headertype === "IMAGE" || headertype === "DOCUMENT");
        {
            const file = req.files;
        }

        const result2 = transformResponseData(result);

        const { templateName, language } = result2;
        const filteredComponents = createComponentPart(result2, payloadReq);

        const payload = {
            messaging_product: "whatsapp",
            to: to,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: language,
                },
                components: filteredComponents,
            },
        };

        try {
            const response = await axios.post(`https://graph.facebook.com/v18.0/${phoneID}/messages`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            if (response.status === 200) {
                // Insert into single_message table
                const Single_id = crypto.randomBytes(16).toString("hex");
                const singleMessageId = await insertIntoSingleMessage(
                    apikey,
                    templateName,
                    Single_id,
                    iid
                );

                const myData = response.data;
                // Insert into message_info table
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
            }
            else {
                logAPI(req.url, apikey, iid, "E");
                return res.status(417).json({ success: false, message: "Failed to send message" });
            }
        }
        catch (error) {
            logAPI(req.url, apikey, iid, "E");
            console.log("error ", error.response);
            return res.status(500).json({
                success: false,
                message: "An error occurred while sending the message",
                payload: payload,
            });
        }
    }
    catch (error) {
        logAPI(req.url, apikey, iid, "E");
        console.log("my error", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the message",
        });
    }
};

module.exports = { sendMessage };
