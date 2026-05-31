const { client } = require("../config/mongo");
const prisma = require("../config/postgres");

async function getActionStats(sessionId) {
  const db = client.db();
  const pipeline = [];

  // dzięki $match baza użyje indeksu zamiast skanować całą kolejcję (indeks złożony)
  if (sessionId) {
    pipeline.push({
      $match: { sessionId: sessionId, action: { $exists: true } },
    });
  } else {
    // fallback dla ogólnych statystyk
    pipeline.push({ $match: { action: { $exists: true } } });
  }

  pipeline.push(
    // $lookup -- dołączenie danych z innej kolekcji
    {
      $lookup: {
        from: "cart_drafts",
        localField: "sessionId",
        foreignField: "sessionId",
        as: "activeCart",
      },
    },
    {
      // spłaszczanie tablicy
      $unwind: {
        path: "$activeCart",
        preserveNullAndEmptyArrays: true, // zostawia logi, nawet jak koszyk jest już usunięty
      },
    },
    {
      // główna agregacja
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
      // formatowanie wyjścia
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

module.exports = {
  getActionStats,
};
