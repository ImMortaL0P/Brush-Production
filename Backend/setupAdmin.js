const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function setupAdmin() {
  const username = process.env.SETUP_ADMIN_USERNAME;
  const password = process.env.SETUP_ADMIN_PASSWORD;
  if (!username || !password) {
    console.error('Set SETUP_ADMIN_USERNAME and SETUP_ADMIN_PASSWORD before running this script.');
    process.exit(1);
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const adminsRef = db.collection('admins');
  await adminsRef.doc(username).set({
    username: username,
    passwordHash: passwordHash,
    role: 'superadmin'
  });
  
  console.log(`Admin user '${username}' created successfully.`);
  process.exit(0);
}

setupAdmin().catch(console.error);
