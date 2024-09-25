const conn = require('../DB/connection');
const status = require("../assets/js/status");
const logAPI = require("../function/log");
const crypto = require("crypto");

const addContactToChannelByCSV = async (req, res) => {
    const apikey = req.cookies.apikey;
    try {
        const channel_id = Buffer.from(req.body.channel_id, "ascii").toString("base64");
        const iid = Buffer.from(req.body.iid, "ascii").toString("base64");
        const existingcontacts = req.body.excont;
        const newcontacts = req.body.newcont;

        if (!channel_id || !existingcontacts) {
            logAPI(req.url, apikey, iid, "E");
            return res.status(400).json({
                success: false,
                message: "Request body is not proper"
            });
        }

        let channeldata = new Array();
        if (newcontacts && newcontacts.length > 0) {
            let newcontactlistquery = newcontacts.map(item => {
                const id = crypto.randomBytes(8).toString("hex");
                return [id, apikey, item.name, item.phone, iid];
            });

            conn.query(`INSERT INTO contact(contact_id, apikey, name, phone, instance_id) values ?`, [newcontactlistquery], function (error, result) {
                if (error) {
                    return res.status(500).send(Object.assign(status.internalservererror(), {
                        error: {
                            detail: `Internal Server Error | Try again after some time`,
                            message: error
                        },
                    }));
                }
                channeldata = newcontactlistquery.map(x => x[0]);

                existingcontacts.map(x => {
                    channeldata.push(x.contact_id);
                });

                let contactchannelquery = channeldata.map(item => {
                    return [channel_id, item, apikey, iid];
                });

                conn.query(`INSERT INTO contact_channel values ?`, [contactchannelquery], function (error, result) {
                    if (error) {
                        return res.status(500).send(Object.assign(status.internalservererror(), {
                            error: {
                                detail: `Internal Server Error | Try again after some time`,
                                message: error
                            },
                        }));
                    }
                    return res.status(200).send(Object.assign(status.ok(), {
                        success: true,
                        data: {
                            detail: `Contact added to channel.`
                        }
                    }));
                });
            });
        }
        else {
            existingcontacts.map(x => {
                channeldata.push(x.contact_id);
            });

            let contactchannelquery = channeldata.map(item => {
                return [channel_id, item, apikey, iid];
            });

            conn.query(`INSERT INTO contact_channel values ?`, [contactchannelquery], function (error, result) {
                if (error) {
                    return res.status(500).send(Object.assign(status.internalservererror(), {
                        error: {
                            detail: `Internal Server Error | Try again after some time`,
                            message: error
                        },
                    }));
                }
                return res.status(200).send(Object.assign(status.ok(), {
                    success: true,
                    data: {
                        detail: `Contact added to channel.`
                    }
                }));
            });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error,
        });
    }
}

module.exports = {
    addContactToChannelByCSV
};
