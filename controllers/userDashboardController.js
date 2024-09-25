const conn = require('../DB/connection');
const status = require("../assets/js/status");
const axios = require("axios");
const { setWabaCred } = require("../controllers/userController");
const logAPI = require("../function/log");

const getDailyReportData = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const q1 = `SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count FROM single_message m,message_info mi WHERE m.single_id = mi.single_id AND mi.status <> 'failed' AND m.apikey = '${apikey}' AND DATE(m.time) = CURDATE() GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND mi.status <> 'failed' AND DATE(b.time) = CURDATE() GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`;

        conn.query(q1, function (err, result) {
            // console.log("E : ", err)
            if (err) return res.status(500).send(status.internalservererror());
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

const getOverallReportData = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const q1 = `SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count,SUM(combined.boardcast_number_count) AS boardcast_number_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count, 0 AS boardcast_number_count FROM single_message m, message_info mi WHERE m.single_id = mi.single_id AND mi.status <> 'failed' AND m.apikey = '${apikey}' GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count, 0 AS boardcast_number_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND mi.status <> 'failed' GROUP BY b.instance_id, b.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, 0 AS boardcast_count, COUNT(b.instance_id) AS boardcast_number_count FROM boardcast b WHERE b.apikey = '${apikey}' GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`;

        conn.query(q1, function (err, result) {
            // console.log("E : ", err)
            if (err) return res.status(500).send(status.internalservererror());
            // if (result.length <= 0) return res.send(status.nodatafound());
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

const getTemplateReportData = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const q1 = `SELECT template, SUM(usage_count) AS total_usage FROM (SELECT template_name AS template, COUNT(*) AS usage_count FROM single_message WHERE apikey = '${apikey}' GROUP BY template_name UNION ALL SELECT template_id AS template, COUNT(*) AS usage_count FROM boardcast WHERE apikey = '${apikey}' GROUP BY template_id ) AS combined_usage GROUP BY template`;

        conn.query(q1, function (err, result) {
            // console.log("E : ", err)
            if (err) return res.status(500).send(status.internalservererror());
            // if (result.length <= 0) return res.send(status.nodatafound());
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

const GetLimitandbalance = async (req, res) => {
    let apikey = req.cookies.apikey;
    let iid = req.params.iid;

    conn.query(`SELECT * from instance where instance_id = '${iid}'`,
        (err, insresult) => {
            if (err) return res.status(500).send(status.internalservererror());
            if (insresult.length <= 0) return res.status(404).send(Object.assign(status.nodatafound(), { success: false }, {
                data: {
                    detail: `No instance found of ${iid}`,
                },
            }))

            conn.query(`SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count FROM single_message m, message_info mi WHERE m.single_id = mi.single_id AND mi.status <> 'failed' AND m.apikey = '${apikey}' AND DATE(m.time) = CURDATE() GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND DATE(b.time) = CURDATE() AND mi.status <> 'failed' GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`,
                (error, results) => {
                    if (error) return res.status(500).send(status.internalservererror());
                    let instanceData = results.filter(x => x.iid == iid)
                    if (instanceData.length > 0) {
                        return res.send({
                            success: true,
                            used: instanceData[0].total_count,
                            remaining: parseInt(1000 - instanceData[0].total_count)
                        });
                    }
                    else {
                        return res.send({
                            success: true,
                            used: 0,
                            remaining: 1000
                        });
                    }
                }
            );
        }
    );
}

const GetBalancepermessage = async (req, res) => {
    const cleanTemplatesData = (data) => {
        return data.map((template) => {
            const cleanedComponents = template.components.map((component) => {
                const { example, ...cleanedComponent } = component;
                return cleanedComponent;
            });
            return { ...template, components: cleanedComponents };
        });
    };

    let apikey = req.cookies.apikey;
    let iid = req.params.iid;

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

    const response = await axios.get(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    if (response.status === 200) {

        const templateTypeList = response.data.data.map(item => ({
            name: item.name,
            language: item.language,
            status: item.status,
            category: item.category,
            id: item.id
        }));

        console.log(templateTypeList);

        // const newData = cleanTemplatesData(response.data.data);
        // logAPI(req.url, apikey, iid, "S");
        return res.status(200).json({
            success: true,
            data: templateTypeList,
        });
    }
    else {
        // logAPI(req.url, apikey, iid, "E");
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching templates",
        });
    }

    // return res.send({
    //     success: true,
    //     data: {
    //         apikey: apikey,
    //         iid: iid
    //     }
    // });

    // conn.query(`SELECT * from instance where instance_id = '${iid}'`, (err, insresult) => {
    //     if (err) return res.status(500).send(status.internalservererror());
    //     if (insresult.length <= 0) return res.status(404).send(Object.assign(status.nodatafound(), { success: false }, {
    //         data: {
    //             detail: `No instance found of ${iid}`,
    //         },
    //     }))

    //     conn.query(`SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count FROM single_message m WHERE m.apikey = '${apikey}' AND DATE(m.time) = CURDATE() GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND DATE(b.time) = CURDATE() GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`,
    //         (error, results) => {
    //             if (error) return res.status(500).send(status.internalservererror());
    //             let instanceData = results.filter(x => x.iid == iid)
    //             if (instanceData.length > 0) {
    //                 return res.send({
    //                     success: true,
    //                     used: instanceData[0].total_count,
    //                     remaining: parseInt(1000 - instanceData[0].total_count)
    //                 });
    //             }
    //             else {
    //                 return res.send({
    //                     success: true,
    //                     used: 0,
    //                     remaining: 1000
    //                 });
    //             }
    //         }
    //     );
    // });
}

const GetInstancePricing = async (req, res) => {
    try {
        console.log("A : ")
        const apikey = req.cookies.apikey;
        let iid = req.params.iid;
        const q1 = `SELECT sm.template_name, sm.apikey, sm.instance_id, COUNT(*) AS all_message, COUNT(CASE WHEN mi.status IN ('sent', 'delivered', 'read') THEN 1 ELSE NULL END) AS successfully_sent, t.category FROM single_message sm LEFT JOIN message_info mi ON sm.single_id = mi.single_id AND mi.status IN ('sent', 'delivered', 'read') LEFT JOIN template t ON sm.template_name = t.template_name AND sm.apikey = t.apikey WHERE sm.apiKey = '${apikey}' AND sm.instance_id = '${iid}' GROUP BY sm.template_name, sm.apikey, t.category`;

        conn.query(q1, [apikey], function (err, result) {
            if (err) return res.status(500).send({ success: false, message: "Internal Server Error" });

            // Calculate pricing
            const dataWithPricing = result.map(row => {
                let pricePerMessage = 0;
                if (row.category === 'marketing') {
                    pricePerMessage = 0.85;
                } else if (row.category === 'utility') {
                    pricePerMessage = 0.15;
                }
                const total_price = row.successfully_sent * pricePerMessage;

                return {
                    ...row,
                    total_price: total_price.toFixed(2) // Ensure pricing is formatted to 2 decimal places
                };
            });

            res.status(200).json({
                success: true,
                data: dataWithPricing,
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.message,
        });
    }
}

module.exports = {
    getDailyReportData,
    getOverallReportData,
    getTemplateReportData,
    GetLimitandbalance,
    GetBalancepermessage,
    GetInstancePricing
};