const express = require("express");
const router = express.Router();

// Controllers Imports
const {
    getDailyReportData,
    getOverallReportData,
    getTemplateReportData,
    GetLimitandbalance,
    GetBalancepermessage,
    GetInstancePricing
} = require("../controllers/userDashboardController");

// Rotues
router.get("/getDailyReportData", getDailyReportData);
router.get("/getOverallReportData", getOverallReportData);
router.get("/getTemplateReportData", getTemplateReportData);
router.get("/GetLimitandbalance/:iid", GetLimitandbalance);
router.get("/GetBalancepermessage/:iid", GetBalancepermessage);
router.get("/GetInstancePricing/:iid", GetInstancePricing);

module.exports = router;
