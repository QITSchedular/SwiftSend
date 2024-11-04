const axios = require("axios");
const { setWabaCred } = require("../controllers/userController");
const logAPI = require("../function/log");
const conn = require("../DB/connection");
const status = require("../assets/js/status");

const version = "v18.0";

// Removing example from the Template Data
// const cleanTemplatesData = async (data, apikey, iid) => {
//     conn.query(`SELECT * from template where apikey = '${apikey}' AND instance_id = '${iid}'`, function (err, result) {
//         return data.map(async (template) => {
//             const cleanedComponents = await template.components.map((component) => {
//                 const { example, ...cleanedComponent } = component;
//                 return cleanedComponent;
//             });

//             const matchingRecord = result.find(record => record.temp_id === template.id);

//             // Add disabled property if matching record found
//             const disabledValue = matchingRecord.disabled;

//             // Add disabled property to the template object
//             // return { ...template, components: cleanedComponents, admindisabled: disabledValue };

//             return { ...template, components: cleanedComponents };
//         });
//     });
// };

const cleanTemplatesData = async (data, apikey, iid) => {
    return new Promise((resolve, reject) => {
        conn.query(`SELECT * from template where apikey = '${apikey}' AND instance_id = '${iid}'`, async (err, result) => {
            if (err) {
                reject(err); // Reject promise on error
                return;
            }

            try {
                const cleanedData = await Promise.all(data.map(async (template) => {
                    const cleanedComponents = await Promise.all(template.components.map((component) => {
                        const { example, ...cleanedComponent } = component;
                        return cleanedComponent;
                    }));

                    const matchingRecord = result.find(record => record.temp_id === template.id);

                    // Add disabled property if matching record found
                    const disabledValue = matchingRecord ? matchingRecord.disabled : 0;

                    // Add disabled property to the template object
                    return { ...template, components: cleanedComponents, admindisabled: disabledValue };
                    // return { ...template, components: cleanedComponents };
                }));

                resolve(cleanedData); // Resolve promise with cleaned data
            } catch (error) {
                reject(error); // Reject promise if any async operation fails
            }
        });
    });
};


//------------------------------------------- Get all template -----------------------------------------------
const getAllTemplate = async (req, res) => {
    const apikey = req.cookies.apikey;
    const iid = req.params.iid;
    try {
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
        const wabaId = wabaCred[0].wabaID;
        const phoneID = wabaCred[0].phoneID;
        const appID = wabaCred[0].appID;

        const response = await axios.get(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });

        if (response.status === 200) {
            cleanTemplatesData(response.data.data, apikey, iid)
                .then((newData) => {
                    logAPI(req.url, apikey, iid, "S");
                    return res.status(200).json({
                        success: true,
                        data: newData,
                    });
                })
                .catch((error) => {
                    console.error('Error cleaning templates data:', error);
                    logAPI(req.url, apikey, iid, "E");
                    return res.status(500).json({
                        success: false,
                        error: 'Error cleaning templates data',
                    });
                });
        }
        else {
            logAPI(req.url, apikey, iid, "E");
            return res.status(500).json({
                success: false,
                message: "An error occurred while fetching templates",
            });
        }
    }
    catch (error) {
        logAPI(req.url, apikey, iid, "E");
        console.log("error : ", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching templates",
        });
    }
};

//------------------------------------------- Get All Template Status ----------------------------------------
const getAllTemplateStatus = async (req, res) => {
    try {
        const email = req.cookies.email;
        const apikey = req.cookies.apikey;

        const wabaCred = await setWabaCred(apikey, email);

        if (wabaCred.length <= 0) {
            logAPI(req.url, apikey, iid, "E");
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

        const response = await axios.get(
            `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const responseData = response.data;

        if (Array.isArray(responseData)) {
            const filteredData = responseData.map((template) => {
                const { name, language, status, category, id } = template;
                return { name, language, status, category, id };
            });

            logAPI(req.url, apikey, iid, "S");
            return res.status(200).json({
                success: true,
                data: filteredData,
            });
        }
        else if (responseData.data && Array.isArray(responseData.data)) {
            const filteredData = responseData.data.map((template) => {
                const { name, language, status, category, id } = template;
                return { name, language, status, category, id };
            });

            logAPI(req.url, apikey, iid, "S");
            return res.status(200).json({
                success: true,
                data: filteredData,
            });
        }
        else {
            console.error("Unexpected response structure:", responseData);
            logAPI(req.url, apikey, iid, "E");
            return res.status(500).json({
                success: false,
                message: "Unexpected response structure",
                responseData: responseData,
            });
        }
    } catch (error) {
        logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching templates",
            errorMessage: error.response,
        });
    }
};

//------------------------------------------- Get Template By ID ---------------------------------------------
const getAllTemplateID = async (req, res) => {
    const email = req.cookies.email;
    const apikey = req.cookies.apikey;

    const wabaCred = await setWabaCred(apikey, email);

    if (wabaCred.length <= 0) {
        // logAPI(req.url, apikey, iid, "E");
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

    if (!templateID) {
        return res
            .status(400)
            .json({ success: false, message: "Template ID is required" });
    }

    let decodedId;
    try {
        decodedId = Buffer.from(templateID, "base64").toString("ascii");
    } catch (error) {
        console.error("Error decoding ID:", error);
        return res
            .status(400)
            .json({ success: false, message: "Invalid template ID" });
    }

    try {
        const response = await axios.get(
            `https://graph.facebook.com/${version}/${decodedId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        const responseData = response.data;

        if (response.status === 200) {
            res.status(200).json({
                success: true,
                data: responseData,
            });
        } else {
            res.status(500).json({
                success: false,
                message: "An error occurred while fetching templates",
                errorMessage: error.response,
            });
        }
    } catch (error) {
        if (error.response) {
            const statusCode = error.response.status;
            if (statusCode === 400 || statusCode === 404 || statusCode === 500) {
                return res.status(statusCode).json({
                    success: false,
                    message: "Error from Facebook API",
                    errorMessage: error.response.data,
                });
            }
        }
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching templates",
            errorMessage: error.response,
        });
    }
};

//------------------------------------------- Create Template -------------------------------------------------

const createTemplate = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const { name, language, category, components, iid } = req.body;

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
        const wabaId = wabaCred[0].wabaID;
        const phoneID = wabaCred[0].phoneID;
        const appID = wabaCred[0].appID;

        // Extract data from the request body

        const filteredComponents = components ? components.filter((component) => component !== null) : [];

        // Construct the message payload
        const payload = {
            name: name,
            language: language,
            category: category,
            components: components,
        };

        try {
            const response = await axios.post(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`, // Fix the token format
                    "Content-Type": "application/json",
                },
            });

            if (response.status === 200) {
                logAPI(req.url, apikey, iid, "S", JSON.stringify({
                    reason: `Template created`,
                    code: 200,
                    clientDetail: {
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                }));
                conn.query(`INSERT into template(temp_id, template_name,category,instance_id, apikey) values (?,?,?,?,?)`, [response.data.id, name, category, iid, apikey], function (err1, result1) {
                    if (err1) return res.status(500).send(status.internalservererror());
                    return res.status(200).json({
                        success: true,
                        message: "Template created successfully"
                    });
                });
            }
            else {
                logAPI(req.url, apikey, iid, "E");
                return res.status(406).json({ success: false, message: "Failed to create a Template" });
            }
        } catch (error) {
            console.log("error ", error.response.data);
            logAPI(req.url, apikey, iid, "E");
            return res.status(406).json({
                success: false,
                message: "An error occurred while creating the template",
            });
        }
    } catch (error) {
        console.log("this is my error", error.data);
        logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "An error occurred while creating the templatee",
        });
    }
};

//-------------------------------------------- Delete Template -------------------------------------------------
const deleteTemplateByID = async (req, res) => {
    const templateID = req.params.id;
    const templateName = req.params.name;
    const iid = req.params.iid;

    if (!templateID) {
        logAPI(req.url, apikey, iid, "E");
        return res.status(400).json({ success: false, message: "Template ID is required" });
    }

    let decodedId;
    try {
        decodedId = Buffer.from(templateID, "base64").toString("ascii");
    }
    catch (error) {
        logAPI(req.url, apikey, iid, "E");
        return res.status(400).json({ success: false, message: "Invalid template ID" });
    }

    try {
        const apikey = req.cookies.apikey;
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
        const wabaId = wabaCred[0].wabaID;
        const phoneID = wabaCred[0].phoneID;
        const appID = wabaCred[0].appID;

        const response = await axios.delete(
            `https://graph.facebook.com/${version}/${wabaId}/message_templates?hsm_id=${decodedId}&name=${templateName}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        const responseData = response.data;
        if (response.status === 200) {
            logAPI(req.url, apikey, iid, "S", JSON.stringify({
                reason: `Template deleted`,
                code: 200,
                clientDetail: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            }));
            conn.query(`DELETE from template WHERE temp_id = '${decodedId}'`, function (err1, result1) {
                if (err1) return res.status(500).send(status.internalservererror());
                return res.status(200).json({
                    success: true,
                    message: "Template Deleted Successfully",
                });
            });
        } else {
            logAPI(req.url, apikey, iid, "E");
            return res.status(500).json({ success: false, message: "Failed to delete template" });
        }
    } catch (error) {
        logAPI(req.url, apikey, iid, "E");
        if (error.response) {
            const statusCode = error.response.status;
            if (statusCode === 400 || statusCode === 404 || statusCode === 500) {
                return res.status(statusCode).json({
                    success: false,
                    message: "Error from Facebook API",
                    errorMessage: error.response.data,
                });
            }
        }
        console.error("Error occurred while fetching templates:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching templates",
            errorMessage: error.response.error_user_title,
        });
    }
};
//-------------------------------------------- For media Template -------------------------------------------------
const mediaForTemplate = async (req, res) => {
    const apikey = req.cookies.apikey;
    const iid = req.body.iid;

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
    const wabaId = wabaCred[0].wabaID;
    const phoneID = wabaCred[0].phoneID;
    const appID = wabaCred[0].appID;

    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            logAPI(req.url, apikey, iid, "E");
            return res.status(400).send("No files were uploaded.");
        }

        // Access uploaded file using the correct key
        const uploadedFile = req.files.file;

        // Handle the uploaded file as needed
        const fileSize = uploadedFile.size;
        const fileType = uploadedFile.mimetype;
        const fileData = uploadedFile.data;

        const response1 = await axios.post(`https://graph.facebook.com/${version}/${appID}/uploads?file_length=${fileSize}&file_type=${fileType}`,
            fileData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": fileType,
            },
        });

        const secretKey = response1.data.id;
        const response2 = await axios.post(`https://graph.facebook.com/${version}/${secretKey}`,
            fileData, {
            headers: {
                Authorization: `OAuth ${token}`,
                "Content-Type": fileType, // Set content type explicitly
            },
        });

        logAPI(req.url, apikey, iid, "S");
        return res.status(200).json({
            success: true,
            message: "Media uploaded successfully ",
            data: response2.data,
        });
    } catch (error) {
        logAPI(req.url, apikey, iid, "S");
        console.error("Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    getAllTemplate,
    getAllTemplateStatus,
    getAllTemplateID,
    deleteTemplateByID,
    createTemplate,
    mediaForTemplate,
};
