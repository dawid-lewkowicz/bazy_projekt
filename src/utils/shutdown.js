// src/utils/shutdown.js
const prisma = require("../config/postgres");
const { closeMongo } = require("../config/mongo");

function setupGracefulShutdown(server) {
  async function gracefulShutdown() {
    console.log(
      "\nOtrzymano sygnał zamknięcia. Rozpoczynam Graceful Shutdown...",
    );

    server.close(async () => {
      console.log("Serwer HTTP zamknięty.");

      try {
        await closeMongo();
        await prisma.$disconnect();
        console.log("🛑 Zamknięto połączenie z PostgreSQL");

        console.log("Zakończono czyszczenie zasobów. Wychodzę z kodem 0.");
        process.exit(0);
      } catch (err) {
        console.error("Błąd podczas zamykania zasobów", err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error("Wymuszam zamknięcie po 10 sekundach (timeout).");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

module.exports = setupGracefulShutdown;
