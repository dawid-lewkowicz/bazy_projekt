const request = require("supertest");
const app = require("../src/index");
const prisma = require("../src/config/postgres");
const { connectMongo, closeMongo } = require("../src/config/mongo");

beforeAll(async () => {
  await connectMongo();
});

afterAll(async () => {
  await prisma.$disconnect();
  await closeMongo();
});

describe("Krytyczne ścieżki API", () => {
  it("GET /menu - Powinno zwrócić listę menu z kodem 200", async () => {
    const res = await request(app).get("/menu");

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it("POST /checkout/:sessionId - Powinno odrzucić pusty koszyk (Błąd 400)", async () => {
    const fakeSessionId = `test-session-${Date.now()}`;
    const res = await request(app).post(`/checkout/${fakeSessionId}`);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("code", "CART_EMPTY");
    expect(res.body).toHaveProperty("error");
  });
});
