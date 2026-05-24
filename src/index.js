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

const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/carts", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/menu", catalogRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// if żeby testy nie odpalały się na portcie 3000
if (require.main === module) {
  const server = app.listen(PORT, async () => {
    await connectMongo();
    console.log(`Serwer działa na porcie http://localhost:${PORT}`);
  });

  setupGracefulShutdown(server);
}

module.exports = app;
