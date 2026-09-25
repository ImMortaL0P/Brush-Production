require('dotenv').config();
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const p = await db.collection('products').findOne({});
  console.log("_id:", p._id, "type:", typeof p._id);
  console.log("id:", p.id, "type:", typeof p.id);
  await client.close();
})();
