const status = require("../assets/js/status");
const crypto = require('crypto');
const conn = require('../DB/connection');

//log INSERT
function logAPI(api, apikey, iid, type, desc = null) {
    const logid = `log-${crypto.randomBytes(6).toString("hex")}`;
    conn.query(`insert into log values(?,?,?,?,?,?,?)`, [logid, apikey, iid, api, type, new Date(), desc], function (err, res) {
        if (err) return status.internalservererror().status_code;
        return status.ok().status_code;
    });
}

module.exports = logAPI;
