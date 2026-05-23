const express = require("express");
const router = express.Router();
const checkoutService = require("../services/checkoutService");

// finalizacja transakcji
router.post("/:sessionId", async (req, res, next) => {
  try {
    const order = await checkoutService.processCheckout(req.params.sessionId);
    res.json({ message: "Zamówienie sfinalizowane pomyślnie!", order });
  } catch (err) {
    if (err.message.includes("Koszyk jest pusty")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes("OVERSELL")) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
