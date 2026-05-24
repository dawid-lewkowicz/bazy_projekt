const request = require("supertest");
const app = require("../src/index");
const { client } = require("../src/config/mongo");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

afterAll(async () => {
  await client.close();
  await prisma.$disconnect();
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
    expect(res.body).toHaveProperty("error");
  });

  it("POST /checkout/:sessionId - Powinno sfinalizować transakcję, obniżyć stan i zapisać log w Mongo", async () => {
    const db = client.db();
    const validSessionId = `test-success-${Date.now()}`;

    await db.collection("cart_drafts").insertOne({
      sessionId: validSessionId,
      items: [{ variantSku: "BUR-CL-MA", quantity: 1 }],
    });

    const res = await request(app).post(`/checkout/${validSessionId}`);

    expect(res.statusCode).toEqual(200);

    expect(res.body.order).toHaveProperty("status", "PAID");
    expect(res.body.order).toHaveProperty("totalAmount");

    const deletedCart = await db
      .collection("cart_drafts")
      .findOne({ sessionId: validSessionId });
    expect(deletedCart).toBeNull();

    const eventLog = await db.collection("event_logs").findOne({
      sessionId: validSessionId,
      action: "CHECKOUT_COMPLETED",
    });
    expect(eventLog).toBeTruthy();
  });
});
