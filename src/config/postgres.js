const { PrismaClient } = require("@prisma/client");

const prismaBase = new PrismaClient();

// rozszerzony klient z hookami domenowymi i walidacją
const prisma = prismaBase.$extends({
  query: {
    variant: {
      //hook domenowy, sprawdzamy walidację przed zapisem i aktualizacją wariantu
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

        // ostateczne wysłanie do bazy danych
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
    },
  },
});

module.exports = prisma;
