const request = require("supertest");
const app = require("../src/index");
const { client } = require("../src/config/mongo");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const createdSessions = [];

afterAll(async () => {
  const db = client.db();
  if (createdSessions.length > 0) {
    await db.collection("cart_drafts").deleteMany({
      sessionId: { $in: createdSessions },
    });
    await db.collection("event_logs").deleteMany({
      sessionId: { $in: createdSessions },
    });
  }
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
    createdSessions.push(validSessionId);

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

describe("Testy wszystkich endpointów", () => {
  const menuCategory = "Burgery";
  const sessionId = `all-endpoints-${Date.now()}`;
  const highValueSession = `high-value-${Date.now()}`;
  const analyticsSession = `analytics-${Date.now()}`;

  createdSessions.push(sessionId, highValueSession, analyticsSession);

  it("GET /menu - powinno zwrócić menu i przyciąć wyniki po kategorii", async () => {
    const res = await request(app).get("/menu");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);

    const filtered = await request(app)
      .get("/menu")
      .query({ cat: menuCategory });
    expect(filtered.statusCode).toEqual(200);
    expect(Array.isArray(filtered.body)).toBeTruthy();
    expect(
      filtered.body.every(
        (item) =>
          item.category?.name === menuCategory ||
          item.category?.name === undefined ||
          item.category?.name === menuCategory,
      ),
    ).toBeTruthy();
  });

  it("GET /menu/desc - powinno zwrócić listę opisów wariantów", async () => {
    const res = await request(app).get("/menu/desc");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /carts/:sessionId - powinno utworzyć pusty koszyk", async () => {
    const res = await request(app).get(`/carts/${sessionId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toMatchObject({ sessionId, items: [] });
  });

  it("POST /carts/:sessionId/items - powinno dodać produkt do koszyka", async () => {
    const res = await request(app)
      .post(`/carts/${sessionId}/items`)
      .send({ variantSku: "BUR-CL-MA", quantity: 2 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.sessionId).toEqual(sessionId);
    expect(res.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variantSku: "BUR-CL-MA", quantity: 2 }),
      ]),
    );
  });

  it("DELETE /carts/:sessionId/items/:sku - powinno usunąć jedną sztukę produktu", async () => {
    const removeRes = await request(app).delete(
      `/carts/${sessionId}/items/BUR-CL-MA`,
    );
    expect(removeRes.statusCode).toEqual(200);
    expect(removeRes.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variantSku: "BUR-CL-MA", quantity: 1 }),
      ]),
    );
  });

  it("POST /checkout/:sessionId - powinno zrealizować transakcję wysokiej wartości i zarejestrować zamówienie", async () => {
    await request(app)
      .post(`/carts/${highValueSession}/items`)
      .send({ variantSku: "BUR-DR-MA", quantity: 1 });

    const res = await request(app).post(`/checkout/${highValueSession}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.order).toHaveProperty("status", "PAID");
    expect(Number(res.body.order.totalAmount)).toBeGreaterThanOrEqual(50);
  });

  it("GET /analytics/stats - powinno zwrócić statystyki akcji dla sesji", async () => {
    await request(app)
      .post(`/carts/${analyticsSession}/items`)
      .send({ variantSku: "BUR-CL-MA", quantity: 1 });

    const statsRes = await request(app)
      .get("/analytics/stats")
      .query({ sessionId: analyticsSession });

    expect(statsRes.statusCode).toEqual(200);
    expect(Array.isArray(statsRes.body)).toBeTruthy();
    expect(
      statsRes.body.some((item) => item.actionType === "ADD_ITEM"),
    ).toBeTruthy();
  });

  it("GET /analytics/orders/high-value - powinno zwrócić tylko zamówienia powyżej min", async () => {
    const res = await request(app)
      .get("/analytics/orders/high-value")
      .query({ min: 50 });

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(
      res.body.every((order) => Number(order.totalAmount) >= 50),
    ).toBeTruthy();
  });

  it("GET /analytics/orders/high-value - niepoprawny parametr min powinien zwrócić 400", async () => {
    const res = await request(app)
      .get("/analytics/orders/high-value")
      .query({ min: "abc" });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /analytics/low-stocks i /analytics/low-stocks-with-ammount - powinny zwrócić dane", async () => {
    const lowStocks = await request(app).get("/analytics/low-stocks");
    expect(lowStocks.statusCode).toEqual(200);
    expect(Array.isArray(lowStocks.body)).toBeTruthy();

    const lowStocksAmount = await request(app).get(
      "/analytics/low-stocks-with-ammount",
    );
    expect(lowStocksAmount.statusCode).toEqual(200);
    expect(Array.isArray(lowStocksAmount.body)).toBeTruthy();
  });

  it("GET /analytics/get-stocks - powinno zwrócić całkowity stan magazynowy", async () => {
    const stocksRes = await request(app).get("/analytics/get-stocks");
    expect(stocksRes.statusCode).toEqual(200);
    expect(typeof stocksRes.body).toBe("number");
    expect(stocksRes.body).toBeGreaterThan(0);
  });

  it("GET /analytics/average-price - powinno zwrócić średnią cenę", async () => {
    const avgRes = await request(app).get("/analytics/average-price");
    expect(avgRes.statusCode).toEqual(200);
    expect(avgRes.body).toHaveProperty("averagePrice");
    expect(typeof avgRes.body.averagePrice).toBe("number");
    expect(avgRes.body.averagePrice).toBeGreaterThan(0);
  });

  it("GET /analytics/modifiers - powinno zwrócić dane o modyfikatorach", async () => {
    const modifiersRes = await request(app).get("/analytics/modifiers");
    expect(modifiersRes.statusCode).toEqual(200);
    expect(Array.isArray(modifiersRes.body)).toBeTruthy();
  });

  it("GET /analytics/raport - powinno zwrócić raport sprzedażowy", async () => {
    const reportRes = await request(app).get("/analytics/raport");
    expect(reportRes.statusCode).toEqual(200);
    expect(reportRes.body).toHaveProperty("obrotGotowy");
    expect(reportRes.body).toHaveProperty("sumaProduktów");
    expect(reportRes.body).toHaveProperty("bestsellers");
    expect(Array.isArray(reportRes.body.bestsellers)).toBeTruthy();
  });
});
