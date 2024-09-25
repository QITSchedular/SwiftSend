const status = require("../assets/js/status");
const conn = require('../DB/connection');

const tableData = (data, callback) => {
    try {
        const sql = `SELECT * FROM ${data.table} WHERE ${data.paramstr} AND apikey = '${data.apikey}'`;
        // console.log(sql);
        conn.query(sql, (err, result) => {
            if (err) return callback(Object.assign(status.internalservererror(), { error: err }));
            // if (err) return callback(status.internalservererror());
            if (result.length == 0) return callback(status.nodatafound());
            return callback(result);
        });
    } catch (e) {
        console.log(e);
        callback(status.internalservererror());
    }
};

module.exports = tableData;
