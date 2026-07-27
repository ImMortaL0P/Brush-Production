require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function main() {
  const stockerHash = crypto.createHash('sha256').update('stocker#7').digest('hex');
  const mangalamHash = crypto.createHash('sha256').update('Kukku404#').digest('hex');

  await db.collection('admins').doc('stocker').set({
    username: 'stocker',
    passwordHash: stockerHash,
    role: 'stocker'
  });

  await db.collection('admins').doc('mangalam').set({
    username: 'mangalam',
    passwordHash: mangalamHash,
    role: 'superadmin'
  });

  console.log('Admins added successfully!');
}
main().catch(console.error);
