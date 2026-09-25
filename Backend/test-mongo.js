require('dotenv').config();
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const product = await db.collection('products').findOne({});
  console.log(product.image);
  await client.close();
})();
