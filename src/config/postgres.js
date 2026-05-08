const { PrismaClient } = require("@prisma/client");

// Inicjalizacja podstawowego klienta
const prismaBase = new PrismaClient();

// Tworzymy rozszerzonego klienta z hookami domenowymi i walidacją
const prisma = prismaBase.$extends({
  query: {
    variant: {
      // HOOK DOMENOWY: Wpinamy się przed zapisem i aktualizacją Wariantu
      async create({ args, query }) {
        // WALIDACJA: Cena wariantu musi być dodatnia
        if (args.data.price !== undefined && args.data.price <= 0) {
          throw new Error(
            "Walidacja Domenowa: Cena wariantu musi być większa niż 0!",
          );
        }

        // HOOK MUTUJĄCY: Automatycznie wymuszamy wielkie litery dla SKU przed zapisem do bazy
        if (args.data.sku) {
          args.data.sku = args.data.sku.toUpperCase().trim();
        }

        return query(args);
      },
      async update({ args, query }) {
        // WALIDACJA przy aktualizacji
        if (args.data.price !== undefined && args.data.price <= 0) {
          throw new Error(
            "Walidacja Domenowa: Cena wariantu nie może zostać zmieniona na 0 lub mniej!",
          );
        }

        if (args.data.sku) {
          args.data.sku = args.data.sku.toUpperCase().trim();
        }

        return query(args);
      },
    },
    modifier: {
      // HOOK DOMENOWY: Wpinamy się w modyfikatory
      async create({ args, query }) {
        // WALIDACJA: Cena modyfikatora nie może być ujemna (ale może być 0, np. "Bez cebuli")
        if (args.data.price !== undefined && args.data.price < 0) {
          throw new Error(
            "Walidacja Domenowa: Cena modyfikatora nie może być ujemna!",
          );
        }
        return query(args);
      },
    },
  },
});

module.exports = prisma;
