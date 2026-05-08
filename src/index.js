require("dotenv").config();
const express = require("express");
const prisma = require("./config/postgres");
const { connectMongo } = require("./config/mongo");

const app = express();
app.use(express.json());

const cartRoutes = require("./routes/cartRoutes");
app.use("/carts", cartRoutes);

const checkoutRoutes = require("./routes/checkoutRoutes");
app.use("/checkout", checkoutRoutes);

const analyticsRoutes = require("./routes/analyticsRoutes");
app.use("/analytics", analyticsRoutes);

// Prosty endpoint testowy - Katalog (Wymóg T2: Dynamiczny where)
app.get("/menu", async (req, res) => {
  const { cat } = req.query;

  // To jest bezpieczne zapytanie przez Prismę (pod spodem parametryzowane)
  const items = await prisma.menuItem.findMany({
    where: cat ? { category: { name: cat } } : {},
    include: { variants: true, modifiers: true },
  });

  res.json(items);
});

// Globalny Error Handler (Wymóg T1: Mapowanie błędów)
app.use((err, req, res, next) => {
  console.error(err);
  // Przykład mapowania błędu unikalności Prismy (P2002) na HTTP 409
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "Taki rekord już istnieje (SQL: 23505)" });
  }
  res.status(500).json({ error: "Błąd serwera" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await connectMongo();
  console.log(`🚀 Serwer śmiga na http://localhost:${PORT}`);
});
