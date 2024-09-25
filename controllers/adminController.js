const conn = require('../DB/connection');
const status = require("../assets/js/status");
const { setWabaCred } = require('./userController');

const getalluser = async (req, res) => {
    try {
        conn.query(`SELECT * from users`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.send(Object.assign(status.ok(), {
                    success: true,
                    data: result,
                }))
            }

            return res.status(200).send({
                success: true,
                data: result,
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const getallinstance = async (req, res) => {
    try {
        conn.query(`SELECT i.*, u.uname from instance i, users u where i.apikey = u.apikey ORDER BY i.apikey`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.send(Object.assign(status.ok(), {
                    success: true,
                    data: result,
                }))
            }

            return res.status(200).send({
                success: true,
                data: result,
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const deleteuser = async (req, res) => {
    try {
        const apikey = req.params.id;

        conn.query(`SELECT * from users where apikey = '${apikey}'`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Apikey : ${apikey} not found`
                    },
                }))
            }
            conn.query(`DELETE from users WHERE apikey = '${apikey}'`, function (err1, result1) {
                if (err1) return res.status(500).send(status.internalservererror());
                return res.status(200).send({
                    success: true,
                    data: {
                        detail: `User Deleted`
                    },
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const deleteinstance = async (req, res) => {
    try {
        const iid = req.params.id;

        conn.query(`SELECT * from instance where instance_id = '${iid}'`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Instance Id : ${iid} not found`
                    },
                }))
            }
            conn.query(`DELETE from instance WHERE instance_id = '${iid}'`, function (err1, result1) {
                if (err1) return res.status(500).send(status.internalservererror());
                return res.status(200).send({
                    success: true,
                    data: {
                        detail: `Instance Deleted`
                    },
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const updateInstancestatus = async (req, res) => {
    try {
        const iid = req.body.iid;

        conn.query(`SELECT * from instance where instance_id = '${iid}'`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Instance Id : ${iid} not found`
                    },
                }))
            }
            if (result[0].isRoot === 1) {
                const instanceAPIKey = result[0].apikey;
                const instancestatus = result[0].disabled == 0 ? 1 : 0;
                conn.query(`UPDATE instance SET disabled = ${instancestatus} WHERE apikey = '${instanceAPIKey}'`, function (err1, result1) {
                    if (err1) return res.status(500).send(status.internalservererror());
                    return res.status(200).send({
                        success: true,
                        data: {
                            detail: `Main & all other Instance Updated`
                        },
                    });
                });

            }
            else {
                const instanceID = result[0].instance_id;
                const instancestatus = result[0].disabled == 0 ? 1 : 0;
                conn.query(`UPDATE instance SET disabled = ${instancestatus} WHERE instance_id = '${instanceID}'`, function (err1, result1) {
                    if (err1) return res.status(500).send(status.internalservererror());
                    return res.status(200).send({
                        success: true,
                        data: {
                            detail: `Instance Updated`
                        },
                    });
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const updateMaininstance = async (req, res) => {
    try {
        const instance = req.body.instancelist;
        const user = req.body.userlist;

        conn.query(`SELECT * from instance where instance_id = '${instance}' and apikey = '${user}'`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Instance Id / apikey not found`
                    },
                }))
            }
            conn.query(`UPDATE instance SET isRoot = false WHERE apikey = '${user}'`, function (err1, result1) {
                if (err1) return res.status(500).send(status.internalservererror());
                conn.query(`UPDATE instance SET isRoot = true WHERE instance_id = '${instance}' and apikey = '${user}'`, function (err2, result2) {
                    if (err2) return res.status(500).send(status.internalservererror());
                    return res.status(200).send({
                        success: true,
                        data: {
                            detail: `Main Instance Updated`
                        },
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const gettransferdata = async (req, res) => {
    try {
        conn.query(`SELECT u.uname, i.instance_id, i.i_name, i.phone, i.apikey, i.isRoot, i.disabled from instance i, users u where u.apikey = i.apikey`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }
            const groupedData = result.reduce((acc, item) => {
                const { apikey, ...otherData } = item;
                if (!acc[apikey]) {
                    acc[apikey] = [];
                }
                acc[apikey].push(otherData);
                return acc;
            }, {});

            Object.keys(groupedData).forEach(apikey => {
                groupedData[apikey].sort((a, b) => b.isRoot - a.isRoot);
            });

            return res.send(Object.assign(status.ok(), {
                success: true,
                data: groupedData,
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

const getallusercred = async (req, res) => {
    try {
        conn.query(`SELECT u.uname, i.i_name, i.isRoot, wc.* from whatsapp_cred wc, users u, instance i where u.apikey = wc.apikey and i.apikey = u.apikey and i.instance_id = wc.instance_id ORDER BY wc.apikey`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }
            return res.send(Object.assign(status.ok(), {
                success: true,
                data: result,
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

const addwabacred = async (req, res) => {
    try {
        const user = req.body.userlist;
        const instance = req.body.instancelist;
        const wabaid = req.body.wabaid;
        const phoneid = req.body.phoneid;
        const phone = req.body.phone;
        const appid = req.body.appid;
        const token = req.body.token;

        if (user && instance && wabaid && phoneid && phone && appid && token) {
            conn.query(`SELECT * from whatsapp_cred wc where phoneNumber = '${phone}'`, function (err, result) {
                if (err) return res.status(500).send(status.internalservererror());
                if (result.length > 0) {
                    return res.status(409).send(Object.assign(status.duplicateRecord(), {
                        success: false,
                        data: {
                            detail: `You have already add the credential for ${phone}`
                        },
                    }))
                }
                conn.query(`INSERT INTO whatsapp_cred(apiKey, permanentToken, wabaID, phoneID, appID, phoneNumber, instance_id) values(?,?,?,?,?,?,?)`,
                    [user, token, wabaid, phoneid, appid, phone, instance],
                    function (error, result) {
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
                                detail: `Credential Added for ${phone}`
                            }
                        }));
                    }
                );
            });
        }
        else {
            return res.status(406).json({
                success: false,
                message: "Inproper data in body",
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const deleteCREDRecord = async (req, res) => {
    try {
        const id = req.params.id;

        conn.query(`SELECT * from whatsapp_cred where id = '${id}'`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `WABA CRED ID : ${id} not found`
                    },
                }))
            }
            conn.query(`DELETE from whatsapp_cred WHERE id = '${id}'`, function (err1, result1) {
                if (err1) return res.status(500).send(status.internalservererror());
                return res.status(200).send({
                    success: true,
                    data: {
                        detail: `WABA CRED Deleted`
                    },
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const getallmessage = async (req, res) => {
    try {
        conn.query(`SELECT sm.template_name, sm.time, sm.single_id, mi.reciver_number, mi.status, mi.waba_message_id, i.phone, i.i_name, i.isRoot, u.uname from single_message sm, message_info mi, instance i, users u where u.apikey = sm.apikey and sm.single_id = mi.single_id and i.instance_id = sm.instance_id ORDER BY sm.time DESC`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }
            return res.send(Object.assign(status.ok(), {
                success: true,
                data: result,
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

const getallTemplate = async (req, res) => {
    try {
        conn.query(`SELECT t.temp_id, i.phone, i.i_name, i.isRoot, u.uname, t.disabled, t.apikey, t.instance_id from template t, instance i, users u where u.apikey = t.apikey and i.instance_id = t.instance_id ORDER BY t.instance_id`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }

            return res.send(Object.assign(status.ok(), {
                success: true,
                data: result,
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

const updatetemplatestatus = async (req, res) => {
    try {
        const template = req.body.templateid;

        conn.query(`SELECT * from template where temp_id = ?`, [Buffer.from(template, "base64").toString("ascii")], function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Template Id found`
                    },
                }))
            }
            let disable = result[0].disabled ? false : true;

            conn.query(`UPDATE template SET disabled = ? WHERE temp_id = ?`, [disable, Buffer.from(template, "base64").toString("ascii")], function (err2, result2) {
                if (err2) return res.status(500).send(status.internalservererror());
                return res.status(200).send({
                    success: true,
                    data: {
                        detail: `Template Status Updated`
                    },
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const gettemplatedetail = async (req, res) => {
    try {
        const templateID = [Buffer.from(req.body.templateid, "base64").toString("ascii")];
        const apikey = [Buffer.from(req.body.apikey, "base64").toString("ascii")];
        const iid = [Buffer.from(req.body.iid, "base64").toString("ascii")];

        const wabaCred = await setWabaCred(apikey, iid);

        if (wabaCred.length <= 0) {
            logAPI(req.url, apikey, iid, "E");
            return res.status(404).json({
                success: false,
                message: "An error occurred while fetching templates",
                detail: "Instance not found"
            });
        }

        return res.status(200).send({
            success: true,
            data: {
                detail: `Template Status Updated`,
                data: wabaCred
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const getallcontacts = async (req, res) => {
    try {
        conn.query(`SELECT c.name, c.email, c.phone, c.disable, i.i_name, i.isRoot, u.uname from contact c, instance i, users u where u.apikey = c.apikey and i.instance_id = c.instance_id ORDER BY c.apikey`, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) {
                return res.status(404).send(Object.assign(status.nodatafound(), {
                    success: false,
                    data: {
                        detail: `Not data found`
                    },
                }))
            }
            return res.send(Object.assign(status.ok(), {
                success: true,
                data: result,
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
    getalluser, getallinstance, deleteuser, deleteinstance, updateInstancestatus, gettransferdata, updateMaininstance, getallusercred, addwabacred, deleteCREDRecord, getallmessage, getallTemplate, updatetemplatestatus, gettemplatedetail, getallcontacts
};
