const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");

router.get("/stats", async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const stats = await analyticsService.getActionStats(sessionId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
