const { client } = require("../config/mongo");

async function getActionStats() {
  const db = client.db();

  // To jest Twój Pipeline Agregujący (Wymóg T7)
  const pipeline = [
    {
      $group: {
        _id: "$action", // Grupujemy po typie akcji (np. ADD_ITEM, CHECKOUT_COMPLETED)
        count: { $sum: 1 }, // Zliczamy wystąpienia
      },
    },
    {
      $sort: { count: -1 }, // Sortujemy malejąco
    },
  ];

  const stats = await db.collection("event_logs").aggregate(pipeline).toArray();
  return stats;
}

module.exports = { getActionStats };
