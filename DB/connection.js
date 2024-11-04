
const mysql = require("mysql");

const conn = mysql.createConnection({
    host: "164.52.208.110",
    user: "qitsolution_tempuser",
    password: "Qit123@#india",
    database: "qitsolution_sswba",
    charset: "utf8mb4",
});

conn.connect((err) => {
    if (err) {
        console.error("🔴 : \x1b[31mError connecting to the database\x1b[0m :", err);
        return;
    }
    console.log("🟢 : \x1b[32mDatabase Connected\x1b[0m");
});

module.exports = conn;