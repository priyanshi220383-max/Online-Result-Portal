// OPTIONAL MongoDB connection (Unit 4). Used only for report-card snapshots.
// If MONGODB_URI is empty, or the server is unreachable, the feature is simply
// reported as "not available" - the rest of the portal keeps working.
const { MongoClient } = require('mongodb');
const env = require('./env');

let clientPromise = null;

function mongoEnabled() {
  return Boolean(env.mongoUri);
}

async function getSnapshotCollection() {
  if (!mongoEnabled()) return null;
  try {
    if (!clientPromise) {
      clientPromise = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 3000 }).connect();
    }
    const client = await clientPromise;
    const col = client.db(env.mongoDb).collection('report_card_snapshots');
    return col;
  } catch (err) {
    clientPromise = null; // retry on next request
    console.warn('MongoDB unavailable:', err.message);
    return null;
  }
}

module.exports = { mongoEnabled, getSnapshotCollection };
