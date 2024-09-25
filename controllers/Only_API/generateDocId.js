const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { setWabaCred } = require("../../controllers/userController");
const logAPI = require("../../function/log");

const genDocId = async (req, res) => {
    const version = "v19.0";

    try {
        const apiKey = req.cookies.apikey;
        const iid = req.body.iid;
        const wabaCred = await setWabaCred(apiKey, iid);

        if (wabaCred.length <= 0) {
            logAPI(req.url, apiKey, iid, "E");
            return res.status(404).json({
                success: false,
                message: "An error occurred while fetching templates",
                detail: "Instance not found"
            });
        }

        const token = wabaCred[0].permanentToken;
        const phoneID = wabaCred[0].phoneID;

        if (!req.files || Object.keys(req.files).length === 0) {
            logAPI(req.url, apiKey, iid, "E");
            return res.status(400).send("No files were uploaded.");
        }

        const uploadedFile = req.files.file;
        const formData = new FormData();

        formData.append("messaging_product", "whatsapp");
        formData.append("file", uploadedFile.data, uploadedFile.name);

        const response = await axios.post(`https://graph.facebook.com/${version}/${phoneID}/media`,
            formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...formData.getHeaders(),
            },
        });

        if (response.data.id) {
            logAPI(req.url, apiKey, iid, "S");
            return res.status(200).json({
                message: "Media uploaded successfully",
                data: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Error uploading media:",
            error.response ? error.response.data : error.message
        );
        logAPI(req.url, apiKey, iid, "E");
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { genDocId };
