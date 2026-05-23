// PostgreSQL do twardych stanów:stany magazynowe, menu
// MongoDB do ulotnych stanów: koszyk z sesji i logi

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
const catalogRoutes = require("./routes/catalogRoutes");

const app = express();
app.use(express.json());

// dokumentacja - wizualny interface
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routing
app.use("/carts", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/menu", catalogRoutes);

app.get("/orders/high-value", async (req, res, next) => {
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

// obsługa błędów
app.use(errorHandler);

// inicjalizacja serwera
const PORT = process.env.PORT || 3000;

// if żeby testy nie odpalały się na portcie 3000
if (require.main === module) {
  const server = app.listen(PORT, async () => {
    await connectMongo(); // połączenie się z MongoDB Atlas
    console.log(`Serwer działa na porcie http://localhost:${PORT}`);
  });

  // miękkie wyłączenie serwera
  setupGracefulShutdown(server);
}

// cała konfiguracja (routing, errory, stawienia bazy) dla testów
module.exports = app;
