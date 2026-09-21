// (Optional — server.js now runs the same sync automatically on every
// start.) Syncs stored product prices with the Qikink-based rate table in
// productTypes.js (posters -> A4 base price, T-shirts -> Classic Crew DTF
// base price). The storefront and checkout already price these types from
// productTypes.js regardless; this keeps the database, admin panel and
// any exports consistent with what customers are charged.
//
//   node scripts/apply_qikink_pricing.js           # dry run, prints changes
//   node scripts/apply_qikink_pricing.js --apply   # writes them
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const { PRODUCT_TYPES, normalizeProductType } = require('../productTypes');

const APPLY = process.argv.includes('--apply');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const products = client.db().collection('products');

  const docs = await products.find({}).toArray();
  let changes = 0;
  for (const doc of docs) {
    const key = normalizeProductType(doc.productType, doc.category);
    const cfg = PRODUCT_TYPES[key];
    if (!cfg || typeof cfg.basePrice !== 'number') continue;
    if (doc.price === cfg.basePrice && doc.pricingSource === 'qikink') continue;
    changes++;
    console.log(`${APPLY ? 'UPDATE' : 'would update'} #${doc.id} ${doc.name}: ₹${doc.price} -> ₹${cfg.basePrice} (${key})`);
    if (APPLY) {
      await products.updateOne({ _id: doc._id }, { $set: { price: cfg.basePrice, pricingSource: 'qikink' } });
    }
  }
  console.log(`${changes} product(s) ${APPLY ? 'updated' : 'to update — re-run with --apply'}.`);
  await client.close();
})().catch(err => { console.error(err); process.exit(1); });
