require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsRef = db.collection('products');

  const cursor = productsRef.find({ category: 'Apparel' });
  let updated = 0;
  for await (const doc of cursor) {
    const brandMatch = doc.image.match(/Tshirt\s+designs\/(.+?)_front\.png/i);
    let brand = brandMatch ? brandMatch[1] : '';
    
    // Create images array: back, front, size chart
    // We assume size chart is assets/Tshirt designs/1788842546SizeChart1.png
    let images = [];
    if (brand) {
      images = [
        `assets/Tshirt designs/${brand}_back.png`,
        `assets/Tshirt designs/${brand}_front.png`,
        `assets/Tshirt designs/1788842546SizeChart1.png`
      ];
    } else {
      images = [
        doc.backImage || doc.image,
        doc.image,
        `assets/Tshirt designs/1788842546SizeChart1.png`
      ];
    }

    await productsRef.updateOne(
      { _id: doc._id },
      { $set: { images } }
    );
    updated++;
  }

  console.log(`Updated ${updated} apparel products to use images array.`);
  await client.close();
}

run().catch(console.error);
