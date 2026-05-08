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

// NOWY ENDPOINT - WYMÓG T4: Surowe zapytanie SQL ($queryRaw)
app.get("/orders/high-value", async (req, res, next) => {
  try {
    // Pobieramy minimalną kwotę z query, domyślnie 50
    const minAmount = req.query.min ? Number(req.query.min) : 50;

    if (isNaN(minAmount)) {
      return res.status(400).json({ error: "Parametr min musi być liczbą" });
    }

    // T4: Zastosowanie $queryRaw jako tagged template literal.
    // Dzięki tej składni Prisma automatycznie parametryzuje wejście (zapobiega SQL Injection)
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

// Globalny Error Handler (Wymóg T10: Jednolity format błędów)
app.use((err, req, res, next) => {
  console.error("Wykryto błąd:", err.message);

  // Domyślna, zunifikowana struktura błędu
  const errorResponse = {
    error: err.message || "Nieznany błąd serwera",
    code: err.code || "INTERNAL_SERVER_ERROR",
    details: err.details || "Brak dodatkowych szczegółów",
  };

  // Obsługa błędów Prismy (np. unikalność)
  if (err.code === "P2002") {
    errorResponse.error = "Naruszenie unikalności danych.";
    errorResponse.code = "DB_UNIQUE_CONSTRAINT";
    errorResponse.details = `Pole: ${err.meta?.target}`;
    return res.status(409).json(errorResponse);
  }

  // Obsługa błędów domenowych z serwisów (Oversell)
  if (err.message.includes("OVERSELL")) {
    errorResponse.code = "DOMAIN_OVERSELL";
    return res.status(409).json(errorResponse);
  }

  if (err.message.includes("Koszyk jest pusty")) {
    errorResponse.code = "CART_EMPTY";
    return res.status(400).json(errorResponse);
  }

  res.status(500).json(errorResponse);
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  await connectMongo();
  console.log(`🚀 Serwer śmiga na http://localhost:${PORT}`);
});

// WYMÓG T5: Zamknięcie przy SIGINT (oraz SIGTERM dla poprawności)
async function gracefulShutdown() {
  console.log(
    "\nOtrzymano sygnał zamknięcia. Rozpoczynam Graceful Shutdown...",
  );

  // 1. Serwer HTTP przestaje przyjmować nowe żądania
  server.close(async () => {
    console.log("Serwer HTTP zamknięty.");

    try {
      // 2. Zamknięcie bazy MongoDB
      const { closeMongo } = require("./config/mongo");
      await closeMongo();

      // 3. Zamknięcie bazy PostgreSQL (Prisma)
      await prisma.$disconnect();
      console.log("🛑 Zamknięto połączenie z PostgreSQL");

      console.log("Zakończono czyszczenie zasobów. Wychodzę z kodem 0.");
      process.exit(0);
    } catch (err) {
      console.error("Błąd podczas zamykania zasobów", err);
      process.exit(1);
    }
  });

  // Hard-kill bezpiecznik: jeśli po 10 sekundach połączenia się nie zamkną, ubijamy proces twardo
  setTimeout(() => {
    console.error("Wymuszam zamknięcie po 10 sekundach (timeout).");
    process.exit(1);
  }, 10000);
}

// Nasłuchiwanie na sygnały z systemu operacyjnego
process.on("SIGINT", gracefulShutdown); // Sygnał wysyłany m.in. przez Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Sygnał wysyłany np. przez środowiska kontenerowe (Docker)
