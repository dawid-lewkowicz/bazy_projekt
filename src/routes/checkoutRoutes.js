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
    next(err);
  }
});

router.get("/paid-orders-raport", async (req, res, next) => {
  try {
    const result = await checkoutService.getPaidOrdersReport();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
module.exports = router;
