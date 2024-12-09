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

const getallcontactwithchannellist = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const iid = req.params.iid;
        // const iid = Buffer.from(req.params.iid, "base64").toString("ascii");

        conn.query(`SELECT 
            c.contact_id,
            c.name,
            c.email,
            c.phone,
            c.disable,
            c.apikey,
            c.instance_id,
            ch.channel_id,
            ch.channelName
        FROM 
            contact c
        LEFT JOIN 
            contact_channel cc ON c.contact_id = cc.contact_id AND c.apikey = cc.apikey AND c.instance_id = cc.instance_id
        LEFT JOIN 
            channel ch ON cc.channel_id = ch.channel_id AND cc.apikey = ch.apikey AND cc.instance_id = ch.instance_id
        WHERE 
            c.apikey = '${apikey}' AND c.instance_id = '${iid}'
        ORDER BY c.contact_id;`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }
            // Transform the results to group channels by contact
            const contacts = result.reduce((acc, row) => {
                const {
                    contact_id, name, email, phone, disable,
                    channel_id, channelName, apikey, instance_id
                } = row;

                if (!acc[contact_id]) {
                    acc[contact_id] = {
                        contact_id,
                        name,
                        email,
                        phone,
                        disable,
                        apikey,
                        instance_id,
                        channels: []
                    };
                }

                // Add channel only if it exists (non-NULL)
                if (channel_id) {
                    acc[contact_id].channels.push({
                        channel_id,
                        channelName,
                    });
                }

                return acc;
            }, {});

            // Convert object to array
            const response = Object.values(contacts);
            return res.send(Object.assign(status.ok(), {
                success: true,
                data: response,
            }))
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

module.exports = {
    addContactToChannelByCSV,
    getallcontactwithchannellist
};
