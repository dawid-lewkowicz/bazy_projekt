const express = require("express");
const router = express.Router();
const prisma = require("../config/postgres");
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

router.get("/orders/high-value", async (req, res, next) => {
  try {
    const minAmount = req.query.min ? Number(req.query.min) : 50;
    if (isNaN(minAmount)) {
      return res.status(400).json({ error: "Parametr min musi być liczbą" });
    }
    // $queryRaw + ${} zabezpiecza przed SQL Injection
    const bigOrders = await prisma.$queryRaw`
      SELECT id, status, "totalAmount", "createdAt" 
      FROM "Order" 
      WHERE "totalAmount" >= ${minAmount} AND status = 'PAID'
      ORDER BY "totalAmount" DESC
    `;
    res.json(bigOrders);
  } catch (err) {
    next(err);
  }
});

router.get("/get-calories", async (req, res, next) => {
  try {
    const result = await analyticsService.getCalories();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/get-usage", async (req, res, next) => {
  try {
    const result = await analyticsService.getUsage();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/get-recent-additions", async (req, res, next) => {
  try {
    const result = await analyticsService.getRecentAdditions();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
