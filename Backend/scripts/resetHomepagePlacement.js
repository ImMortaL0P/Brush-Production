const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productsRef = db.collection('products');

async function main() {
  const snapshot = await productsRef.get();
  console.log(`Found ${snapshot.size} products. Resetting homepage placement flags to false...`);

  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      showInBestsellers: false,
      showInNewArrivals: false,
      showInGrossing: false
    });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Done. Reset placement flags on ${count} products. Nothing else was modified.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
