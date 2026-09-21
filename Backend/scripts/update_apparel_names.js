require('dotenv').config();
const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const nameMap = {
  'Marlboro T-Shirt': 'Marlbored',
  'Smirnoff T-Shirt': 'Smirnope',
  'Absolut T-Shirt': 'Absolut Nonsense',
  'Jagermeister T-Shirt': 'Jagermistakes',
  'Budweiser T-Shirt': 'Bedweiser',
  'Chanel T-Shirt': 'Cancel'
};

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsRef = db.collection('products');

  let updated = 0;
  for (const [oldName, newName] of Object.entries(nameMap)) {
    const finalName = newName + ' T-Shirt'; // Keep the 'T-Shirt' suffix or replace entirely?
    // User requested "the names to be renamed as 1. Marlbored...".
    // They probably just want "Marlbored T-Shirt" or literally "Marlbored".
    // I'll make it exactly what they said. Wait, typically it's nice to add ' T-Shirt', but let's just use EXACTLY what they asked for in the list:
    // If they want "Marlbored T-Shirt", I can do that, but "Cancel" is a bit ambiguous without "T-Shirt". Let's stick to EXACTLY the name plus " T-Shirt" to be consistent, or just the mapped string?
    // I will replace "Marlboro T-Shirt" with "Marlbored T-Shirt".

    // Actually, I'll update it to: newName + ' T-Shirt'
    const updatedName = newName + ' T-Shirt';

    const result = await productsRef.updateOne(
      { name: oldName },
      { $set: { name: updatedName } }
    );

    if (result.matchedCount > 0) {
      console.log(`Updated "${oldName}" to "${updatedName}"`);
      updated++;
    } else {
      console.log(`Could not find "${oldName}"`);
    }
  }

  console.log(`Done. Updated ${updated} Apparel products.`);
  await client.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
