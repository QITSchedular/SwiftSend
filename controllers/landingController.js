const conn = require('../DB/connection');
const status = require("../assets/js/status");
const sendEmail = require("../function/sendEmail");

const getinquirydata = async (req, res) => {
    const { name, email, subject, message, messagebody, acknowledgementbody } = req.body;

    var data = {
        name: name,
        email: email,
        subject: subject,
        message: message,
        messagebody: messagebody,
        acknowledgementbody: acknowledgementbody
    };

    try {
        conn.query(`select * from company where isSet = 1`, function (err, result) {
            if (err || result.length <= 0) return res.send(status.internalservererror());
            if (result.length > 0) {
                const sender = {
                    hostname: `${result[0].hostname}`,
                    port: `${result[0].portnumber}`,
                    email: `${result[0].c_email}`,
                    passcode: `${result[0].passcode}`,
                };
                sendEmail(sender, { to: "20bmiit087@gmail.com", bcc: "" }, subject, messagebody)
                    .then(() => {
                        sendEmail(sender, { to: email, bcc: "" }, "swiftsend - Acknowledgement mail", acknowledgementbody)
                            .then(() => {
                                res.status(200).json({
                                    success: true,
                                    data: result,
                                });
                            })
                            .catch((error) => {
                                res.status(403).json({
                                    success: false,
                                    message: "There was an error in sending the email to client/customer.",
                                    detail: error
                                });
                            });
                    })
                    .catch((error) => {
                        res.status(403).json({
                            success: false,
                            message: "There was an error in sending the email to swiftsend support team.",
                            detail: error
                        });
                    });
            }
        });
    } catch (error) {
        console.log("error: ", error);
    }
}

const getLandingData = async (req, res) => {
    try {
        const q1 = `SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count,SUM(combined.boardcast_number_count) AS boardcast_number_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count, 0 AS boardcast_number_count FROM single_message m GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count, 0 AS boardcast_number_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id GROUP BY b.instance_id, b.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, 0 AS boardcast_count, COUNT(b.instance_id) AS boardcast_number_count FROM boardcast b GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`;
        const q2 = `SELECT combined.instance_id AS iid, i.i_name AS i_name, combined.apikey, SUM(combined.single_message_count) AS single_message_count, SUM(combined.boardcast_count) AS boardcast_count,SUM(combined.boardcast_number_count) AS boardcast_number_count, SUM(combined.single_message_count + combined.boardcast_count) AS total_count FROM (SELECT m.instance_id, m.apikey, COUNT(m.instance_id) AS single_message_count, 0 AS boardcast_count, 0 AS boardcast_number_count FROM single_message m, message_info mi WHERE m.single_id = mi.single_id AND mi.status <> 'failed' GROUP BY m.instance_id, m.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, COUNT(mi.boardcast_id) AS boardcast_count, 0 AS boardcast_number_count FROM message_info mi JOIN boardcast b ON mi.boardcast_id = b.boardcast_id AND mi.status <> 'failed' GROUP BY b.instance_id, b.apikey UNION ALL SELECT b.instance_id, b.apikey, 0 AS single_message_count, 0 AS boardcast_count, COUNT(b.instance_id) AS boardcast_number_count FROM boardcast b GROUP BY b.instance_id, b.apikey) AS combined JOIN instance i ON combined.instance_id = i.instance_id GROUP BY combined.instance_id, i.i_name, combined.apikey`;

        conn.query(q2, function (err, result) {
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

module.exports = { getinquirydata, getLandingData };