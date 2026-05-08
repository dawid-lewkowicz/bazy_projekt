const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);
let db = null;

async function connectMongo() {
  if (db) return db;
  await client.connect();
  db = client.db(); // Pobierze nazwę bazy z URI
  console.log("✅ Połączono z MongoDB Atlas");

  // WYMÓG T5: Tworzenie indeksu złożonego z poziomu kodu
  // Indeks na event_logs przyspieszający wyszukiwanie akcji konkretnego koszyka/sesji
  await db.collection("event_logs").createIndex({ sessionId: 1, action: 1 });
  console.log("✅ Utworzono indeksy MongoDB");

  return db;
}

// Dodana funkcja do zamykania zasobu
async function closeMongo() {
  if (client) {
    await client.close();
    console.log("🛑 Zamknięto połączenie z MongoDB");
  }
}

module.exports = { connectMongo, closeMongo, client };
