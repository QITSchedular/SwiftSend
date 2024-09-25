const axios = require("axios");

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

module.exports = { getTemplateById };
