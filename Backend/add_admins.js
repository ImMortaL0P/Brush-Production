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
  const required = ['STOCKER_PASSWORD', 'MANGALAM_PASSWORD', 'WAJIHA_PASSWORD'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Set ${missing.join(', ')} before running this script.`);
    process.exit(1);
  }

  const stockerHash = crypto.createHash('sha256').update(process.env.STOCKER_PASSWORD).digest('hex');
  const mangalamHash = crypto.createHash('sha256').update(process.env.MANGALAM_PASSWORD).digest('hex');
  const wajihaHash = crypto.createHash('sha256').update(process.env.WAJIHA_PASSWORD).digest('hex');

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

  await db.collection('admins').doc('wajiha').set({
    username: 'wajiha',
    passwordHash: wajihaHash,
    role: 'superadmin'
  });

  console.log('Admins added successfully!');
}
main().catch(console.error);
