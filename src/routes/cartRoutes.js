const express = require("express");
const router = express.Router();
const cartService = require("../services/cartService");

// zwraca obecny stan koszyka
router.get("/:sessionId", async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.params.sessionId);
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// dodawanie elementów do koszyka
router.post("/:sessionId/items", async (req, res, next) => {
  try {
    const cart = await cartService.addItemToCart(
      req.params.sessionId,
      req.body,
    );
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// usuwanie produktu z koszyka
router.delete("/:sessionId/items/:sku", async (req, res, next) => {
  try {
    const cart = await cartService.removeItemFromCart(
      req.params.sessionId,
      req.params.sku,
    );
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
