const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const targetOrderId = '1162';
  let found = false;

  const snapshot = await db.collection('orders').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.orderId === targetOrderId || data.orderId === 'ORD-' + targetOrderId || doc.id === targetOrderId || doc.id === 'ORD-' + targetOrderId) {
      console.log('Found order:', doc.id);
      found = true;
      await db.collection('orders').doc(doc.id).update({
        userId: '3105rajarchit@gmail.com',
        "customer.id": '3105rajarchit@gmail.com'
      });
      console.log('Successfully assigned order', doc.id, 'to 3105rajarchit@gmail.com');
      break;
    }
  }

  if (!found) {
    console.log('Order', targetOrderId, 'not found');
  }
}

run().catch(console.error);
