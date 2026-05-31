const prisma = require("../../config/postgres");

async function seedDatabase() {
  // czyścimy bazę przed seedowaniem
  await prisma.modifier.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();

  await prisma.category.create({
    data: {
      name: "Burgery",
      items: {
        create: [
          {
            name: "Classic Burger",
            description: "Najlepszy w mieście",
            variants: {
              create: [
                {
                  sku: "BUR-CL-MA",
                  name: "Mały",
                  price: 19.99,
                  stock: 100,
                  desc: "desc",
                },
                { sku: "BUR-CL-DU", name: "Duży", price: 29.99, stock: 50 },
              ],
            },
            modifiers: {
              create: [{ name: "Bekon", price: 5.0 }],
            },
          },
          {
            name: "Drwal Burger",
            description: "desc drwal",
            variants: {
              create: [
                { sku: "BUR-DR-MA", name: "Mały", price: 50.99, stock: 100 },
                { sku: "BUR-DR-DU", name: "Duży", price: 55.99, stock: 50 },
              ],
            },
            modifiers: {
              create: [{ name: "Bez cebuli", price: 0.0 }],
            },
          },
        ],
      },
    },
  });

  await prisma.category.create({
    data: {
      name: "Inne",
      items: {
        create: [
          {
            name: "Frytki",
            description: "frytki belgijskie",
            variants: {
              create: [
                { sku: "FRY-BEL", name: "Zwykłe", price: 9.99, stock: 100 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(" Baza danych została wypełniona");
}

async function main() {
  await seedDatabase();
}

if (require.main === module) {
  main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
}

module.exports = { seedDatabase };
