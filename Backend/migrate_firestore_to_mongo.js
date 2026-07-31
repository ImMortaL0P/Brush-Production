// One-time export: Firestore -> MongoDB.
// Run this once MONGODB_URI is set in .env and Firestore is reachable again
// (it was hitting RESOURCE_EXHAUSTED at the time this script was written).
//
//   node migrate_firestore_to_mongo.js
//
// Safe to re-run: every write is an upsert keyed on the same _id the new
// server.js expects, so re-running just overwrites with the latest Firestore
// state instead of duplicating anything.

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { MongoClient } = require('mongodb');

const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

async function migrateProducts(mongoDb) {
  const snapshot = await firestore.collection('products').get();
  const col = mongoDb.collection('products');
  let n = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = typeof data.id === 'number' ? data.id : parseInt(doc.id, 10);
    if (isNaN(id)) {
      console.warn(`Skipping product doc "${doc.id}" — no usable numeric id.`);
      continue;
    }
    await col.updateOne(
      { _id: id },
      { $set: { ...data, _id: id, id } },
      { upsert: true }
    );
    n++;
  }
  console.log(`Products migrated: ${n}`);
}

async function migrateOrders(mongoDb) {
  const snapshot = await firestore.collection('orders').get();
  const col = mongoDb.collection('orders');
  let n = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    await col.updateOne(
      { _id: doc.id },
      { $set: { ...data, _id: doc.id, id: doc.id, createdAt } },
      { upsert: true }
    );
    n++;
  }
  console.log(`Orders migrated: ${n}`);
}

async function migrateUsers(mongoDb) {
  const snapshot = await firestore.collection('users').get();
  const col = mongoDb.collection('users');
  let n = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    await col.updateOne(
      { _id: doc.id },
      { $set: { ...data, _id: doc.id, id: doc.id, createdAt } },
      { upsert: true }
    );
    n++;
  }
  console.log(`Users migrated: ${n}`);
}

async function migrateAdmins(mongoDb) {
  const snapshot = await firestore.collection('admins').get();
  const col = mongoDb.collection('admins');
  let n = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    await col.updateOne(
      { _id: doc.id },
      { $set: { ...data, _id: doc.id } },
      { upsert: true }
    );
    n++;
  }
  console.log(`Admins migrated: ${n}`);
}

async function migrateAdminLogs(mongoDb) {
  const snapshot = await firestore.collection('admin_logs').get();
  const col = mongoDb.collection('admin_logs');
  let n = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const timestamp = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date());
    // Admin logs had Firestore auto-IDs with no meaning of their own, so just insert fresh.
    await col.insertOne({ ...data, timestamp });
    n++;
  }
  console.log(`Admin logs migrated: ${n}`);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in Backend/.env — add your Atlas connection string first.');
    process.exit(1);
  }

  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  console.log('✅ Connected to MongoDB');

  await migrateProducts(mongoDb);
  await migrateOrders(mongoDb);
  await migrateUsers(mongoDb);
  await migrateAdmins(mongoDb);
  await migrateAdminLogs(mongoDb);

  console.log('\nMigration complete.');
  await mongoClient.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
