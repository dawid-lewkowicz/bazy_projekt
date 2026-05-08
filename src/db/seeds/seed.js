const prisma = require("../../config/postgres");

async function main() {
  // Czyścimy bazę przed seedowaniem
  await prisma.modifier.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();

  const burgerCat = await prisma.category.create({
    data: {
      name: "Burgery",
      items: {
        create: {
          name: "Classic Burger",
          description: "Najlepszy w mieście",
          variants: {
            create: [
              { sku: "BUR-CL-MA", name: "Mały", price: 19.99, stock: 100 },
              { sku: "BUR-CL-DU", name: "Duży", price: 29.99, stock: 50 },
            ],
          },
          modifiers: {
            create: [{ name: "Bekon", price: 5.0 }],
          },
        },
      },
    },
  });

  console.log("🌱 Baza danych została nakarmiona!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
