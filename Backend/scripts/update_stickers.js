const { MongoClient } = require('mongodb');
async function run() {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('brush_commerce');
  const result = await db.collection('products').updateMany(
    { productType: 'Stickers' },
    { $set: { price: 79, originalPrice: 149 } }
  );
  console.log('Updated stickers:', result.modifiedCount);
  await client.close();
}
run();
