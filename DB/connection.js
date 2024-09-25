
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
        console.error("Error connecting to the database:", err);
        return;
    }
    console.log("Connected to the database");
});

module.exports = conn;