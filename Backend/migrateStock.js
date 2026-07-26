const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrateStock() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    let updates = {};
    
    // Add unique string ID if not present (e.g. PRD-1001)
    if (!data.sku) {
      updates.sku = 'PRD-' + (1000 + data.id);
    }
    
    // Add stock quantity if not present
    if (data.stockQuantity === undefined) {
      updates.stockQuantity = 50; // Default stock
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} products with SKU and stockQuantity.`);
  } else {
    console.log('No products needed migration.');
  }
  process.exit(0);
}

migrateStock().catch(console.error);
