const { client } = require("../config/mongo");
const prisma = require("../config/postgres");

async function getCart(sessionId) {
  const db = client.db();
  let cart = await db
    .collection("cart_drafts")
    .findOne({ sessionId }, { projection: { _id: 0 } });

  if (!cart) {
    cart = { sessionId, items: [], createdAt: new Date() };
    await db.collection("cart_drafts").insertOne(cart);
  }
  return cart;
}

async function addItemToCart(sessionId, item) {
  const db = client.db();

  const actualVariant = await prisma.variant.findUnique({
    where: { sku: item.variantSku },
  });

  if (!actualVariant) {
    throw new Error("Produkt o podanym SKU nie istnieje");
  }

  const secureItem = {
    variantId: actualVariant.id,
    variantSku: actualVariant.sku,
    price: Number(actualVariant.price),
    quantity: Number(item.quantity),
  };

  const updateResult = await db.collection("cart_drafts").updateOne(
    {
      sessionId,
      "items.variantSku": secureItem.variantSku,
    },
    { $inc: { "items.$.quantity": secureItem.quantity } },
  );

  if (updateResult.matchedCount === 0) {
    await db.collection("cart_drafts").updateOne(
      { sessionId },
      {
        $push: { items: secureItem },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  await db.collection("event_logs").insertOne({
    sessionId,
    action: "ADD_ITEM",
    itemSku: secureItem.variantSku,
    timestamp: new Date(),
  });

  return getCart(sessionId);
}

async function removeItemFromCart(sessionId, variantSku) {
  const db = client.db();

  await db
    .collection("cart_drafts")
    .updateOne(
      { sessionId, "items.variantSku": variantSku },
      { $inc: { "items.$.quantity": -1 } },
    );

  await db
    .collection("cart_drafts")
    .updateOne(
      { sessionId },
      { $pull: { items: { variantSku: variantSku, quantity: { $lte: 0 } } } },
    );

  await db.collection("event_logs").insertOne({
    sessionId,
    action: "REMOVE_ITEM",
    itemSku: variantSku,
    timestamp: new Date(),
  });

  return getCart(sessionId);
}

async function globalAvg() {
  const db = client.db();

  const pipeline = [
    { $unwind: "$items" },
    {
      $group: {
        _id: "$sessionId",
        cartSum: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    {
      $group: {
        _id: null,
        avg: {
          $avg: "$cartSum",
        },
      },
    },
  ];

  const result = await db
    .collection("cart_drafts")
    .aggregate(pipeline)
    .toArray();

  if (result.length === 0) {
    return 0;
  }

  return Number(result[0].avg);
}

async function clearAbandonedCarts() {
  const db = client.db();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db.collection("cart_drafts").deleteMany({
    createdAt: { $lte: sevenDaysAgo },
  });

  return {
    success: true,
    deletedCount: result.deletedCount,
  };
}

module.exports = {
  clearAbandonedCarts,
  globalAvg,
  getCart,
  addItemToCart,
  removeItemFromCart,
};
