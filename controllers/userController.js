const axios = require("axios");
const conn = require("../DB/connection");

const setWabaCred = (apiKey, iid) => {
  const query = `SELECT * FROM whatsapp_cred WHERE apiKey = ? AND instance_id = ?`;
  // const query = `desc whatsapp_cred`;

  return new Promise((resolve, reject) => {
    conn.query(query, [apiKey, iid], (error, results, field) => {
      if (error) {
        return reject(error);
      } else {
        // console.log(results);
        resolve(results);
      }
    });
  });
};

module.exports = { setWabaCred };
