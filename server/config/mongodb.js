// MongoDB configuration
// Using native driver for maximum flexibility (and vulnerability surface)
const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'hellcorp';

let db = null;
let client = null;

async function connectMongo() {
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[DB] MongoDB connected successfully');
    return db;
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    // Retry after 5 seconds
    setTimeout(connectMongo, 5000);
  }
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB not initialized. Call connectMongo() first.');
  }
  return db;
}

function getClient() {
  return client;
}

module.exports = { connectMongo, getDb, getClient };
