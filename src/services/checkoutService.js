const prisma = require("../config/postgres");
const { client } = require("../config/mongo");

async function processCheckout(sessionId) {
  const db = client.db();

  const cart = await db.collection("cart_drafts").findOne({ sessionId });
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new Error("Koszyk jest pusty lub nie istnieje");
  }

  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
    // KROK NOWY: Sprawdzanie i zdejmowanie ze stanu magazynowego (Blokada oversell)
    for (const item of cart.items) {
      const variant = await tx.variant.findUnique({
        where: { sku: item.variantSku },
      });

      // Walidacja dostępności
      if (!variant || variant.stock < item.quantity) {
        throw new Error(
          `OVERSELL: Brak produktu ${item.variantSku} w magazynie! Zostało: ${variant?.stock || 0}`,
        );
      }

      // Aktualizacja stanu magazynowego
      await tx.variant.update({
        where: { sku: item.variantSku },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Krok A: Utworzenie zamówienia ze snapshotem
    const newOrder = await tx.order.create({
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

    // Krok B: Próba sprzątania w Mongo
    const deleteResult = await db
      .collection("cart_drafts")
      .deleteOne({ sessionId });
    if (deleteResult.deletedCount === 0) {
      throw new Error(
        "Błąd spójności: Nie można zamknąć koszyka. Wycofuję zamówienie.",
      );
    }

    // Krok C: Zapis eventu
    await db.collection("event_logs").insertOne({
      sessionId,
      action: "CHECKOUT_COMPLETED",
      orderId: newOrder.id,
      timestamp: new Date(),
    });

    return newOrder;
  });

  return order;
}

module.exports = { processCheckout };
