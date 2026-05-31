const prisma = require("../config/postgres");
const { client } = require("../config/mongo");

async function processCheckout(sessionId, expectedTotal, idempotencyKey) {
  const db = client.db();

  // idempotencja
  if (idempotencyKey) {
    const existingCheckout = await db.collection("event_logs").findOne({
      idempotencyKey,
      action: "CHECKOUT_COMPLETED",
    });

    if (existingCheckout) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: existingCheckout.orderId },
      });

      if (existingOrder) {
        return existingOrder;
      }

      const err = new Error(
        "Żądanie zostało już wcześniej przetworzone, ale nie udało się odnaleźć zamówienia.",
      );
      err.code = "IDEMPOTENCY_CONFLICT";
      throw err;
    }
  }

  const cart = await db.collection("cart_drafts").findOne({ sessionId });
  if (!cart || !cart.items || cart.items.length === 0) {
    const err = new Error("Koszyk jest pusty lub nie istnieje");
    err.code = "CART_EMPTY";
    throw err;
  }

  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
    let secureTotalAmount = 0;
    const orderLinesData = [];

    // blokada oversell
    for (const item of cart.items) {
      // pobieramy aktualną, autoryzowaną cenę prosto z Postgre
      const variant = await tx.variant.findUnique({
        where: { sku: item.variantSku },
      });

      if (!variant) {
        const err = new Error(`Produkt ${item.variantSku} nie istnieje.`);
        err.code = "VARIANT_NOT_FOUND";
        throw err;
      }

      secureTotalAmount += variant.price * item.quantity;

      const updateResult = await tx.variant.updateMany({
        where: {
          sku: item.variantSku,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (updateResult.count === 0) {
        const err = new Error(
          `OVERSELL: Brak wystarczającej ilości produktu ${item.variantSku} w magazynie`,
        );
        err.code = "DOMAIN_OVERSELL";
        throw err;
      }

      orderLinesData.push({
        variantSku: item.variantSku,
        nameSnapshot: `Produkt ${item.variantSku}`,
        priceSnapshot: variant.price,
        quantity: item.quantity,
      });
    }

    if (expectedTotal !== undefined && expectedTotal !== null) {
      const expected = Number(expectedTotal);
      if (Number.isNaN(expected) || Number(secureTotalAmount) !== expected) {
        const err = new Error(
          "Ceny produktów uległy zmianie w trakcie konfiguracji zamówienia. Odśwież koszyk.",
        );
        err.code = "PRICE_MISMATCH";
        throw err;
      }
    }

    return await tx.order.create({
      data: {
        totalAmount: secureTotalAmount,
        status: "PAID",
        lines: {
          create: orderLinesData,
        },
      },
    });
  });

  try {
    const deleteResult = await db
      .collection("cart_drafts")
      .deleteOne({ sessionId });
    if (deleteResult.deletedCount === 0) {
      throw new Error("Nie można zlokalizować koszyka do usunięcia.");
    }

    await db.collection("event_logs").insertOne({
      sessionId,
      idempotencyKey: idempotencyKey || null,
      action: "CHECKOUT_COMPLETED",
      orderId: order.id,
      timestamp: new Date(),
    });
  } catch (mongoError) {
    console.error("Błąd spójności! Uruchamiam kompensację", mongoError);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "FAILED_SYSTEM_ERROR" },
      });

      // oddanie towaru do stanu magazynowego
      for (const item of cart.items) {
        await tx.variant.update({
          where: { sku: item.variantSku },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    const err = new Error(
      "Błąd spójności pomiędzy bazami danych. Zamówienie wycofane",
    );
    err.code = "COMPENSATED_TRANSACTION_ERROR";
    throw err;
  }

  return order;
}

module.exports = { processCheckout };
