// src/index.js
require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const prisma = require("./config/postgres");
const { connectMongo } = require("./config/mongo");
const errorHandler = require("./middlewares/errorHandler");
const setupGracefulShutdown = require("./utils/shutdown");

const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
app.use(express.json());

// --- DOKUMENTACJA ---
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- ROUTING ---
app.use("/carts", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/analytics", analyticsRoutes);

// Wymóg T2 / T4: Endpointy surowe i testowe na poziomie roota (opcjonalnie do przeniesienia do kontrolerów)
app.get("/menu", async (req, res) => {
  const { cat } = req.query;
  const items = await prisma.menuItem.findMany({
    where: cat ? { category: { name: cat } } : {},
    include: { variants: true, modifiers: true },
  });
  res.json(items);
});

app.get("/orders/high-value", async (req, res, next) => {
  try {
    const minAmount = req.query.min ? Number(req.query.min) : 50;
    if (isNaN(minAmount)) {
      return res.status(400).json({ error: "Parametr min musi być liczbą" });
    }
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

// --- OBSŁUGA BŁĘDÓW ---
app.use(errorHandler);

// --- INICJALIZACJA SERWERA ---
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, async () => {
    await connectMongo();
    console.log(`🚀 Serwer śmiga na http://localhost:${PORT}`);
  });

  // Podpięcie czystego wyłączania serwera
  setupGracefulShutdown(server);
}

module.exports = app;
