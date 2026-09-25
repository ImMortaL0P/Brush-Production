require('dotenv').config({ path: __dirname + '/.env' });
const { MongoClient } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const order = await client.db().collection('orders').findOne({});
  if (order) {
    const { execSync } = require('child_process');
    execSync(`curl -sS -o invoice.pdf http://localhost:5500/api/orders/${order._id}/invoice`);
    const size = require('fs').statSync('invoice.pdf').size;
    console.log("PDF updated, size:", size, "bytes");
  }
  await client.close();
}
test().catch(console.error);
