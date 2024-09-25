const conn = require('../DB/connection');
const status = require("../assets/js/status");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const tableData = require("../function/commonQuery");

const getallInstance = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const q1 = `SELECT * from instance where apikey = '${apikey}' order by isRoot desc`;
        // const q1 = `SELECT * from instance where apikey = '${apikey}' and disabled = 0`;

        conn.query(q1, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) return res.status(404).send(status.nodatafound());

            res.status(200).json({
                success: true,
                data: result,
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

const createInstance = async (req, res) => {
    function create(id, name, apikey, token, uname, pwd, phone) {
        tableData({
            table: "instance",
            paramstr: `(i_name = '${name}')`,
            apikey: apikey,
        }, (result) => {
            if (result.status_code == 404) {
                bcrypt.hash(pwd, 10, (err, hash) => {
                    if (err)
                        return res.send(
                            Object.assign(status.badRequest(), {
                                error: { detail: `Error in Signup` },
                            })
                        );
                    conn.query(`INSERT INTO instance(instance_id,i_name,apikey,token,create_date,username,password,phone) values('${id}','${name}','${apikey}','${token}',CURRENT_DATE,'${uname}','${hash}','${phone}')`,
                        function (error, result) {
                            if (error)
                                return res.send(
                                    Object.assign(status.internalservererror(), {
                                        error: {
                                            detail: `Internal Server Error | Try again after some time`,
                                            message: error
                                        },
                                    })
                                );

                            return res.send(
                                Object.assign(status.created(), {
                                    data: {
                                        detail: `Instance Created Successfully`,
                                        "Instance ID": id,
                                    },
                                })
                            );
                        }
                    );

                });

            }
            else {
                return res.send(
                    Object.assign(status.duplicateRecord(), {
                        error: {
                            detail: `Instance with this name already exist`,
                        },
                    })
                );
            }
        });
    }

    try {
        const token = crypto.randomBytes(10).toString("hex");
        const instanceid = crypto.randomBytes(8).toString("hex");
        const instance_name = req.body.instance_name;
        // const uname = req.body.uname;
        // const pwd = req.body.pwd;
        // const phone = req.body.phone;
        const apikey = req.cookies.apikey;
        const { uname, pwd, phone } = req.body
        tableData({
            table: "subscription",
            paramstr: true,
            apikey: apikey,
        }, (result) => {
            if (result.status_code == 404) {
                tableData({
                    table: "instance",
                    paramstr: true,
                    apikey: apikey,
                }, (result) => {
                    if (result.status_code == 404) {
                        create(instanceid, instance_name, apikey, token, uname, pwd, phone);
                    } else {
                        return res.send(
                            Object.assign(status.forbidden(), {
                                error: {
                                    detail: `Instance can't be created. Free instance can only be created once.`,
                                },
                            })
                        );
                    }
                });
            }
            else {
                var latest = new Date(result[0].pay_date),
                    current_date = new Date();
                var planID = result[0].planID;
                let total_instance = 0,
                    duration = 0,
                    remaining_days = 0;
                for (var i in result) {
                    if (latest < new Date(result[i].pay_date)) {
                        latest = new Date(result[i].pay_date);
                        planID = result[i].planID;
                    }
                }

                tableData({
                    table: "plans",
                    paramstr: `planid = ${planID} --`,
                    apikey: apikey,
                }, (result) => {
                    total_instance = result[0].totalInstance;
                    duration = result[0].durationMonth;
                    latest.setMonth(latest.getMonth() + duration);
                    remaining_days = Math.ceil(Math.round(latest - current_date) / (1000 * 60 * 60 * 24));

                    // console.log(latest, total_instance);
                    if (remaining_days > 0) {
                        tableData({
                            table: "instance",
                            paramstr: true,
                            apikey: apikey,
                        }, (result) => {
                            if (result.length >= total_instance) {
                                return res.send(
                                    Object.assign(status.forbidden(), {
                                        error: {
                                            detail: `Max instance purchase limit exceeded. Upgrade plan..`,
                                        },
                                    })
                                );
                            }
                            create(instanceid, instance_name, apikey, token, uname, pwd, phone);
                        });
                    } else {
                        return res.send(
                            Object.assign(status.forbidden(), {
                                error: {
                                    detail: `Plan expired. Reactivate / Purchase new one`,
                                },
                            })
                        );
                    }
                }
                );
            }
        });
    } catch (error) {
        console.log(error)
        return res.send(
            Object.assign(status.unauthorized(), {
                error: {
                    detail: error,
                },
            })
        );
    }
}

const validateInstance = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const q1 = `SELECT * from instance where apikey = '${apikey}' order by isRoot desc`;
        // const q1 = `SELECT * from instance where apikey = '${apikey}' and disabled = 0`;

        conn.query(q1, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) return res.status(404).send(status.nodatafound());

            res.status(200).json({
                success: true,
                data: result,
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
}

module.exports = {
    getallInstance,
    createInstance
};