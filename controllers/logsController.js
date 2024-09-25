const conn = require('../DB/connection');
const status = require("../assets/js/status");

const getLogs = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        let query = `SELECT * from log where apikey = '${apikey}'`;
        if (req.body.iid && req.body.iid != '') {
            query += ` AND instance_id = '${req.body.iid}'`
        }
        if (req.body.type && req.body.type != '') {
            query += ` AND type = '${req.body.type}'`
        }
        if (req.body.api && req.body.api != '') {
            query += ` AND api LIKE '%${req.body.api}%'`
        }
        conn.query(query, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) return res.status(404).send(status.nodatafound());

            return res.status(200).json({
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

module.exports = { getLogs };