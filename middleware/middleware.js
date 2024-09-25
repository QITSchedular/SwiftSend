const conn = require('../DB/connection');
const status = require("../assets/js/status");


const checkApi = (req, res, next) => {
    let apikey = req.body.apikey || req.cookies.apikey;

    conn.query(`SELECT * FROM users WHERE apikey = '${apikey}'`, (error, results) => {
        if (error) return res.status(500).send(status.internalservererror());
        if (results.length <= 0) return res.status(401).send(status.unauthorized());
        next();
    });
}

const checkAdmin = (req, res, next) => {
    let apikey = req.cookies.apikey;
    if (!apikey) return res.status(401).send(status.unauthorized());

    const newAPI = Buffer.from(apikey, "base64").toString("ascii")

    conn.query(`SELECT * FROM admin WHERE apikey = ?`, [newAPI], (error, results) => {
        if (error) return res.status(500).send(status.internalservererror());
        if (results.length <= 0) return res.status(401).send(status.unauthorized());
        next();
    });
}

const checkMsgLimit = (req, res, next) => {
    let apikey = req.body.apikey || req.cookies.apikey;
    let iid = req.body.iid;

    conn.query(`SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count FROM single_message m WHERE m.apikey = '${apikey}' AND DATE(m.time) = CURDATE() GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id WHERE b.apikey = '${apikey}' AND DATE(b.time) = CURDATE() GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`,
        (error, results) => {
            if (error) return res.status(500).send(status.internalservererror());
            let instanceData = results.filter(x => x.iid == iid)
            if (instanceData.length > 0) {
                if (instanceData[0].total_count >= 1000) {
                    return res.status(429).send(Object.assign(status.overlimit(), { success: false }, {
                        data: {
                            detail: `Message limit exceed over 1000`,
                        },
                    }));
                }
            }
            next();
        }
    );
}


module.exports = { checkMsgLimit, checkApi, checkAdmin };