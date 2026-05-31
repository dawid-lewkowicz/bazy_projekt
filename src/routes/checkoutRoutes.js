const express = require("express");
const router = express.Router();
const checkoutService = require("../services/checkoutService");

// finalizacja transakcji
router.post("/:sessionId", async (req, res, next) => {
  try {
    const { expectedTotal } = req.body || {};
    const idempotencyKey = req.headers["x-idempotency-key"];

    const order = await checkoutService.processCheckout(
      req.params.sessionId,
      expectedTotal,
      idempotencyKey,
    );
    res.json({ message: "Zamówienie sfinalizowane pomyślnie!", order });
  } catch (err) {
    if (err.code === "PRICE_MISMATCH") {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    if (err.message.includes("Koszyk jest pusty")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes("OVERSELL")) {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === "IDEMPOTENCY_CONFLICT") {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

module.exports = router;
