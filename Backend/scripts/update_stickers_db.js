require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in .env');
  
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected.');
  
  // Actually checking server.js, the db name is extracted from the URI or default?
  // Let's check server.js again to see how it gets the db.
  const db = client.db();
  
  const result = await db.collection('products').updateMany(
    { productType: 'Stickers' },
    { $set: { price: 79, originalPrice: 149 } }
  );
  
  console.log('Updated stickers:', result.modifiedCount);
  await client.close();
}

run().catch(console.error);
