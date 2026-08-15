require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Previously wrote to Firestore with unsalted SHA-256 hashes — stale since
// the admin store migrated to MongoDB (see migrate_firestore_to_mongo.js)
// and server.js switched to bcrypt. Running the old version silently did
// nothing to the admins the live server actually reads, while also
// provisioning a weaker hash than server.js's own signup path would.
// This targets the same collection/hash scheme server.js uses.

async function main() {
  const required = ['MONGODB_URI', 'STOCKER_PASSWORD', 'MANGALAM_PASSWORD', 'WAJIHA_PASSWORD'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Set ${missing.join(', ')} before running this script.`);
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const adminsRef = client.db().collection('admins');

  const admins = [
    { username: 'stocker', password: process.env.STOCKER_PASSWORD, role: 'stocker' },
    { username: 'mangalam', password: process.env.MANGALAM_PASSWORD, role: 'superadmin' },
    { username: 'wajiha', password: process.env.WAJIHA_PASSWORD, role: 'superadmin' }
  ];

  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await adminsRef.updateOne(
      { _id: admin.username },
      { $set: { username: admin.username, passwordHash, role: admin.role } },
      { upsert: true }
    );
  }

  console.log('Admins added successfully!');
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
