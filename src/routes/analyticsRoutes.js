const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await analyticsService.getActionStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
