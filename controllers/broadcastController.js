const conn = require('../DB/connection');
const status = require("../assets/js/status");

const getallBroadcastData = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const iid = req.params.iid;
        const q1 = `SELECT mi.reciver_number, mi.boardCast_id, mi.status, b.template_id, b.time FROM message_info mi INNER JOIN boardcast b ON mi.boardCast_id = b.boardCast_id WHERE b.apikey = '${apikey}' AND b.instance_id = '${iid}' ORDER BY b.time DESC`;

        conn.query(q1, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) return res.status(404).send(status.nodatafound());
            const filteredresult = result.reduce((acc, curr) => {
                let broadcastEntry = acc.find(entry => entry.boardCast_id === curr.boardCast_id);

                // If it doesn't exist, create a new entry
                if (!broadcastEntry) {
                    broadcastEntry = {
                        boardCast_id: curr.boardCast_id,
                        template_id: curr.template_id,
                        time: curr.time,
                        broadcast: [],
                        success_count: 0,
                        failed_count: 0
                    };
                    acc.push(broadcastEntry);
                }

                // Add the phone and status to the broadcast array of the corresponding broadcast_id
                broadcastEntry.broadcast.push({ phone: curr.reciver_number, status: curr.status });

                // Update success_count and failed_count based on the status
                if (curr.status === 'failed') {
                    broadcastEntry.failed_count++;
                }
                else {
                    broadcastEntry.success_count++;
                }

                return acc;
            }, []);
            res.status(200).json({
                success: true,
                data: filteredresult,
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching data",
            errorMessage: error.response,
        });
    }
};

const getsingleBroadcastData = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const iid = req.params.iid;
        const brodid = req.params.brodid;
        const q1 = `SELECT mi.reciver_number, mi.boardCast_id, mi.status, b.template_id, b.time FROM message_info mi INNER JOIN boardcast b ON mi.boardCast_id = b.boardCast_id WHERE b.apikey = '${apikey}' AND b.instance_id = '${iid}' AND mi.boardCast_id = '${brodid}' ORDER BY b.time DESC`;

        conn.query(q1, function (err, result) {
            if (err) return res.status(500).send(status.internalservererror());
            if (result.length <= 0) return res.status(404).send(status.nodatafound());
            const filteredresult = result.reduce((acc, curr) => {
                let broadcastEntry = acc.find(entry => entry.boardCast_id === curr.boardCast_id);

                // If it doesn't exist, create a new entry
                if (!broadcastEntry) {
                    broadcastEntry = {
                        boardCast_id: curr.boardCast_id,
                        template_id: curr.template_id,
                        time: curr.time,
                        broadcast: [],
                        success_count: 0,
                        failed_count: 0
                    };
                    acc.push(broadcastEntry);
                }

                // Add the phone and status to the broadcast array of the corresponding broadcast_id
                broadcastEntry.broadcast.push({ phone: curr.reciver_number, status: curr.status });

                // Update success_count and failed_count based on the status
                if (curr.status === 'failed') {
                    broadcastEntry.failed_count++;
                }
                else {
                    broadcastEntry.success_count++;
                }

                return acc;
            }, []);
            res.status(200).json({
                success: true,
                data: filteredresult,
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

const getallmessagestatus = async (req, res) => {
    try {
        const apikey = req.cookies.apikey;
        const iid = Buffer.from(req.params.iid, "base64").toString("ascii");

        conn.query(`SELECT sm.template_name, sm.time, sm.single_id, sm.fromapp, mi.reciver_number, mi.status, mi.waba_message_id, i.phone, i.i_name, i.isRoot, u.uname from single_message sm, message_info mi, instance i, users u where u.apikey = sm.apikey and sm.single_id = mi.single_id and i.instance_id = sm.instance_id AND sm.apikey = '${apikey}' and sm.instance_id = '${iid}' ORDER BY sm.time DESC`, function (err, result) {
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
    getallBroadcastData,
    getsingleBroadcastData,
    getallmessagestatus
};