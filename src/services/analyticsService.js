const { client } = require("../config/mongo");
const prisma = require("../config/postgres");

async function getActionStats(sessionId) {
  const db = client.db();
  const pipeline = [];

  if (sessionId) {
    pipeline.push({
      $match: { sessionId: sessionId, action: { $exists: true } },
    });
  } else {
    // fallback dla ogólnych statystyk
    pipeline.push({ $match: { action: { $exists: true } } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "cart_drafts",
        localField: "sessionId",
        foreignField: "sessionId",
        as: "activeCart",
      },
    },
    {
      $unwind: {
        path: "$activeCart",
        preserveNullAndEmptyArrays: true, // zostawia logi, nawet jak koszyk jest już usunięty
      },
    },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        lastOccurrence: { $max: "$timestamp" },
        activeCartsAssociated: {
          // liczy, ile z tych akcji dotyczy koszyków, które są nadal otwarte
          $sum: { $cond: [{ $ifNull: ["$activeCart", false] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        actionType: "$_id",
        totalEvents: "$count",
        lastSeenAt: "$lastOccurrence",
        cartsStillOpen: "$activeCartsAssociated",
      },
    },
    {
      $sort: { totalEvents: -1 },
    },
  );

  return await db.collection("event_logs").aggregate(pipeline).toArray();
}

async function getUsage() {
  const db = client.db();

  const pipeline = [
    {
      $group: {
        _id: { sessionId: "$sessionId", action: "$action" },
        userActivityCount: { $sum: 1 },
      },
    },
    {
      $match: {
        userActivityCount: { $gt: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.action",
        sum: { $sum: "$userActivityCount" },
      },
    },
    {
      $project: {
        _id: 0,
        actionType: "$_id",
        totalEvents: "$sum",
      },
    },
  ];

  return await db.collection("event_logs").aggregate(pipeline).toArray();
}

async function getCalories() {
  const calories = await prisma.menuItem.findMany({
    select: {
      name: true,
      calories: true,
    },
  });

  return calories;
}

async function getRecentAdditions() {
  const db = client.db();

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const pipeline = [
    {
      $match: {
        action: "ADD_ITEM",
        timestamp: { $gte: oneDayAgo },
      },
    },
    { $sort: { timestamp: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        sessionId: 1,
        itemSku: 1,
        date: "$timestamp",
      },
    },
  ];

  return await db.collection("event_logs").aggregate(pipeline).toArray();
}

// async function getOpinions() {
//   const db = client.db();
//   const pipeline = [
//     { $unwind: "$items" },
//     { $group: { _id: "$sessionId", sum: { $sum: "$items.quantity" } } },
//     { $project: { _id: 0, session: "$_id", suma: "$sum" } },
//   ];

//   return await db.collection("cart_drafts").aggregate(pipeline).toArray();
// }

async function getOpinions() {
  const db = client.db();
  const pipeline = [
    {
      $group: {
        _id: "$action",
        sum: { $sum: 1 },
      },
    },
    { $project: { _id: 0, action: "$_id", suma: "$sum" } },
  ];

  return await db.collection("event_logs").aggregate(pipeline).toArray();
}

module.exports = {
  getOpinions,
  getRecentAdditions,
  getCalories,
  getUsage,
  getActionStats,
};
