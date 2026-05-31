const prisma = require("../config/postgres");
const { seedDatabase } = require("./seeds/seed");

async function main() {
  const categoryCount = await prisma.category.count();

  if (categoryCount === 0) {
    console.log("Baza danych jest pusta, seedowanie domyślnych danych...");
    await seedDatabase();
  } else {
    console.log("Baza danych już zawiera dane, seed pominięty.");
  }
}

main()
  .catch((e) => {
    console.error("Błąd inicjalizacji bazy danych:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
