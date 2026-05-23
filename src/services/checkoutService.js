const prisma = require("../config/postgres");
const { client } = require("../config/mongo");

async function processCheckout(sessionId) {
  const db = client.db();

  // idempotencja, nie można wysłać tego samego żądania kilka razy
  const recentCheckout = await db.collection("event_logs").findOne({
    sessionId: sessionId,
    action: "CHECKOUT_COMPLETED",
    timestamp: { $gte: new Date(Date.now() - 5 * 60000) },
  });

  if (recentCheckout) {
    const err = new Error(
      "To zamówienie jest już w trakcie przetwarzania lub zostało ukończone.",
    );
    err.code = "IDEMPOTENCY_CONFLICT";
    throw err;
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
    // blokada oversell
    for (const item of cart.items) {
      const variant = await tx.variant.findUnique({
        where: { sku: item.variantSku },
      });

      if (!variant || variant.stock < item.quantity) {
        const err = new Error(
          `OVERSELL: Brak produktu ${item.variantSku} w magazynie. Zostało: ${variant?.stock || 0}`,
        );
        err.code = "DOMAIN_OVERSELL";
        throw err;
      }

      //odejmowanie ze stanu magazynowego
      await tx.variant.update({
        where: { sku: item.variantSku },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return await tx.order.create({
      data: {
        totalAmount: totalAmount,
        status: "PAID",
        lines: {
          create: cart.items.map((item) => ({
            variantSku: item.variantSku,
            nameSnapshot: `Produkt ${item.variantSku}`,
            priceSnapshot: item.price,
            quantity: item.quantity,
          })),
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
      action: "CHECKOUT_COMPLETED",
      orderId: order.id,
      timestamp: new Date(),
    });
  } catch (mongoError) {
    // kompensacja: operacja w Mongo się nie powiodła, musimy wycofać zmiany z Postgre, aby utrzymac spójność systemu
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
