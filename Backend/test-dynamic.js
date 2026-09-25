require('dotenv').config();
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const items = [{ productId: 5 }, { productId: 8 }];
  const productIds = items.map(item => item.productId).filter(Boolean);
  console.log("productIds:", productIds);
  const latestProducts = await db.collection('products').find({ _id: { $in: productIds } }).toArray();
  console.log("matched by _id:", latestProducts.length);
  const latestProducts2 = await db.collection('products').find({ id: { $in: productIds } }).toArray();
  console.log("matched by id:", latestProducts2.length);
  await client.close();
})();
