require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "user"}:${process.env.POSTGRES_PASSWORD || "password"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || "bazy_projekt"}?schema=public`;

console.log("DATABASE_URL z procesu Dockera:", databaseUrl);

const prismaBase = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const prisma = prismaBase.$extends({
  query: {
    variant: {
      //hook domenowy
      async create({ args, query }) {
        // walidacja
        if (args.data.price !== undefined && args.data.price <= 0) {
          throw new Error(
            "Walidacja Domenowa: Cena wariantu musi być większa niż 0",
          );
        }

        // hook mutujący, ujednolicenie nazw
        if (args.data.sku) {
          args.data.sku = args.data.sku.toUpperCase().trim();
        }

        return query(args);
      },
      async update({ args, query }) {
        // walidacja przy aktualizacji
        if (args.data.price !== undefined && args.data.price <= 0) {
          throw new Error(
            "Walidacja Domenowa: Cena nie może zostać zmieniona na 0 lub mniej",
          );
        }

        if (args.data.sku) {
          args.data.sku = args.data.sku.toUpperCase().trim();
        }

        return query(args);
      },
    },
    modifier: {
      async create({ args, query }) {
        if (args.data.price !== undefined && args.data.price < 0) {
          throw new Error(
            "Walidacja Domenowa: Cena modyfikatora nie może być ujemna",
          );
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data.price !== undefined && args.data.price <= 0) {
          throw new Error(
            "Walidacja Domenowa: Cena nie może zostać zmieniona na 0 lub mniej",
          );
        }

        return query(args);
      },
    },
  },
});

module.exports = prisma;
