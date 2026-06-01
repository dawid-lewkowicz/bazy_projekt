const express = require("express");
const router = express.Router();
const prisma = require("../config/postgres");

// pobieranie katalogów z bazy
router.get("/", async (req, res, next) => {
  try {
    const { cat } = req.query;
    const items = await prisma.menuItem.findMany({
      // dynamic where
      where: cat ? { category: { name: cat } } : {},
      // eager loading
      include: { variants: true, modifiers: true },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get("/desc", async (req, res, next) => {
  try {
    const desc = await prisma.variant.findMany({
      select: {
        desc: true,
      },
    });

    const descriptions = desc.map((v) => v.desc);

    res.json(descriptions);
  } catch (err) {
    next(err);
  }
});

router.get("/get-cat-size", async (req, res, next) => {
  const result = await prisma.category.findMany({
    select: { name: true, _count: { select: { items: true } } },
  });
  res.json(result);
});

module.exports = router;
