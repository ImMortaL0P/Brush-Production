const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'Backend/.env' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const order = await db.collection('orders').findOne({});
  
  if (order) {
    console.log("Found order:", order._id);
    const { execSync } = require('child_process');
    execSync(`curl -sS -o test_invoice.pdf http://localhost:5500/api/orders/${order._id}/invoice`);
    console.log("Invoice downloaded to test_invoice.pdf");
  } else {
    console.log("No orders found to test with.");
  }
  await client.close();
}

run().catch(console.error);
