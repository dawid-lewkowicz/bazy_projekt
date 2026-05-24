const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);
let db = null;

async function connectMongo() {
  if (db) return db; // singleton, jedna pula połączeń przez cały cykl życia serwera
  await client.connect();
  db = client.db();
  console.log(" Połączono z MongoDB Atlas");

  // system MongoDB układa sobie logi alfabetycznie na podstawie numeru sesji, szybkość wyszukiwania drastycznie wzrasta
  await db.collection("event_logs").createIndex({ sessionId: 1, action: 1 });
  console.log(" Utworzono indeksy MongoDB");

  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    console.log(" Zamknięto połączenie z MongoDB");
  }
}

module.exports = { connectMongo, closeMongo, client };
