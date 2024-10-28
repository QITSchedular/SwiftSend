const jwt = require("jsonwebtoken");
const status = require("../assets/js/status");

const VerifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send(Object.assign(status.unauthorized(), {
        error: {
            detail: `Invalid Token / Token not found in header`,
        },
    }));

    const bearerToken = token.split(" ")[1];

    const value = "swiftsend-secret";
    jwt.verify(bearerToken, value, (err, decodedToken) => {
        if (err) return res.status(401).send(Object.assign(status.unauthorized(), {
            error: {
                detail: `Invalid Token / Token may expired`,
            },
        }));

        next();
    });
}

module.exports = { VerifyToken };