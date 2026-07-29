const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixIds() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.where('category', '==', 'Original Movie Posters').get();
  
  const batch = db.batch();
  snapshot.forEach(doc => {
    // Set the id field to be the numeric equivalent of the document ID
    const docId = parseInt(doc.id, 10);
    batch.update(doc.ref, { id: docId });
  });

  await batch.commit();
  console.log(`Updated ${snapshot.size} posters to include the 'id' field.`);
}

fixIds().catch(console.error);
