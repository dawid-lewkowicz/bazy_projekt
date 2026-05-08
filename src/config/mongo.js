const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);
let db = null;

async function connectMongo() {
  if (db) return db;
  await client.connect();
  db = client.db(); // Pobierze nazwę bazy z URI
  console.log("✅ Połączono z MongoDB Atlas");
  return db;
}

module.exports = { connectMongo, client };
