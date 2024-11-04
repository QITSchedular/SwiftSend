const axios = require("axios");
const logAPI = require("../../function/log");
const { setWabaCred } = require("../userController");

const getTemplateById = async (templateID, token) => {
    if (!templateID) {
        throw new Error("Template ID is required");
    }

    try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/${templateID}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            return response.data;
        }
        else {
            throw new Error("Failed to send message");
        }
    } catch (error) {
        if (error.response) {
            const statusCode = error.response.status;
            if (statusCode === 400 || statusCode === 404 || statusCode === 500) {
                console.log("error ", error);
            }
        }
        throw new Error("An error occurred while fetching templates");
    }
};

const getTemplateByIdAPI = async (req, res) => {
    const apikey = req.cookies.apikey;
    const iid = req.params.iid;
    const templateID = req.params.tempid;
    try {
        if (!templateID) {
            return res.status(404).json({
                success: false,
                message: "Template Id is required",
            });
        }
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

        const response = await axios.get(`https://graph.facebook.com/v19.0/${templateID}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });
        console.log("Res : ", response)

        if (response.status === 200) {
            console.log(response.data);
            return res.status(200).json({
                success: true,
                data: response.data,
            });
        }
        else {
            logAPI(req.url, apikey, iid, "E");
            console.log(response.data.data)
            return res.status(500).json({
                success: false,
                message: "An error occurred while fetching templates",
            });
        }
    }
    catch (error) {
        logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "Invalid template ID / template not found",
            detail: error.response.data.error
        });
    }
};

module.exports = { getTemplateById, getTemplateByIdAPI };
