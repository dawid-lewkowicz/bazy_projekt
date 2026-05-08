const { client } = require("../config/mongo");

async function getCart(sessionId) {
  const db = client.db();
  let cart = await db.collection("cart_drafts").findOne({ sessionId });

  if (!cart) {
    cart = { sessionId, items: [], createdAt: new Date() };
    await db.collection("cart_drafts").insertOne(cart);
  }
  return cart;
}

async function addItemToCart(sessionId, item) {
  const db = client.db();

  await db.collection("cart_drafts").updateOne(
    { sessionId },
    {
      $push: { items: item },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  await db.collection("event_logs").insertOne({
    sessionId,
    action: "ADD_ITEM",
    itemSku: item.variantSku,
    timestamp: new Date(),
  });

  return getCart(sessionId);
}

// NOWA FUNKCJA: Wyrzucanie produktu z koszyka
async function removeItemFromCart(sessionId, variantSku) {
  const db = client.db();

  await db
    .collection("cart_drafts")
    .updateOne({ sessionId }, { $pull: { items: { variantSku: variantSku } } });

  await db.collection("event_logs").insertOne({
    sessionId,
    action: "REMOVE_ITEM",
    itemSku: variantSku,
    timestamp: new Date(),
  });

  return getCart(sessionId);
}

module.exports = { getCart, addItemToCart, removeItemFromCart };
