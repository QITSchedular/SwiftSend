const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const path = require('path');
const status = require("../assets/js/status");
const logAPI = require("../function/log");
const { setWabaCred } = require("./userController");

//Credentials
const version = "v18.0";

let toPath = __dirname.split(`${path.sep}`).slice(0, -1).join('/');
function createfolder(foldername) {
    try {

        const dirs = foldername.split('/');
        let currentDir = '';

        for (const dir of dirs) {
            currentDir = path.join(currentDir, dir);

            if (!fs.existsSync(`${toPath}/assets/upload/${currentDir}`)) {
                try {
                    if (fs.mkdirSync(`${toPath}/assets/upload/${currentDir}`)) {
                        status.ok().status_code;
                    }
                    else {
                        status.nodatafound().status_code;
                    }
                } catch (error) {
                    console.log("E1 : ", error)
                }
            }
            else {
                status.duplicateRecord().status_code;
            }
        }
        return true;
    } catch (err) {
        console.log("error : ", err);
        return false;
    }
}

function deleteFolder(folderPath) {
    try {
        if (fs.existsSync(`${toPath}/assets/upload/${folderPath}`)) {
            fs.readdirSync(`${toPath}/assets/upload/${folderPath}`).forEach((file) => {
                const currentPath = path.join(`${toPath}/assets/upload/${folderPath}`, file);
                if (fs.lstatSync(currentPath).isDirectory()) {
                    deleteFolder(currentPath);
                } else {
                    fs.unlinkSync(currentPath);
                }
            });
            fs.rmdirSync(`${toPath}/assets/upload/${folderPath}`);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}

const uploadMedia = async (req, res) => {
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
        const wabaId = wabaCred[0].wabaID;
        const phoneID = wabaCred[0].phoneID;
        const appID = wabaCred[0].appID;

        if (!req.files) {
            logAPI(req.url, apiKey, iid, "E");
            return res.status(400).json({ error: "No file uploaded" });
        }

        let x = createfolder(`wba/${apiKey}`);
        const uploadedFile = req.files.image;
        const uploadPath = `${toPath}/assets/upload/wba/${apiKey}/${uploadedFile.name}`;
        uploadedFile.mv(uploadPath, async function (err) {
            if (err) return res.status(500).json({ error: "Internal server error", message: err });

            let filepath = `${toPath}/assets/upload/wba/${apiKey}/${uploadedFile.name}`;

            const formData = new FormData();
            formData.append("messaging_product", "whatsapp");
            formData.append("file", fs.createReadStream(filepath));

            try {
                const response = await axios.post(`https://graph.facebook.com/${version}/${phoneID}/media`,
                    formData, {
                    headers: {
                        ...formData.getHeaders(),
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data.id) {
                    deleteFolder(`wba/${apiKey}`);
                    logAPI(req.url, apiKey, iid, "S");
                    return res.status(200).json({ success: true, message: "Media uploaded successfully", data: response.data });
                }
            } catch (err) {
                logAPI(req.url, apiKey, iid, "E");
                return res.status(400).json({ success: false, message: "Invalid File Type. supported type : [image | PDF | XML]" });
            }
        });
    } catch (error) {
        logAPI(req.url, apiKey, iid, "E");
        console.error("Error uploading media:", error.response.data);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { uploadMedia };