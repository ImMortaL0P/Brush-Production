require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PRODUCT_TYPES, normalizeProductType } = require('../productTypes');

const sourceDir = "/Volumes/MangalamHDD/Brush Content/New/Typography Centric Illustrated/Upload";
const targetOriginals = path.join(__dirname, '../../public/assets/Typography');
const targetThumbs1080 = path.join(__dirname, '../../public/img/w1080/assets/Typography');
const targetThumbs480 = path.join(__dirname, '../../public/img/w480/assets/Typography');

// Create directories
fs.mkdirSync(targetOriginals, { recursive: true });
fs.mkdirSync(targetThumbs1080, { recursive: true });
fs.mkdirSync(targetThumbs480, { recursive: true });

const sourceFiles = [
  "Dimensions.png",
  "Icarus.png",
  "Needing Nothing.png",
  "Pressure is a Privilege.png"
];

const category = "Typography";
// A descriptive blurbs map for each typography poster
const contentMap = {
  "Dimensions": "A striking typographic exploration of space and perspective, rendered in high-contrast illustrated style.",
  "Icarus": "Bold typography meets classical mythology. An illustrated homage to ambition, consequences, and flying too close to the sun.",
  "Needing Nothing": "Minimalist, profound, and illustrated. A typographic mantra celebrating self-sufficiency and raw stillness.",
  "Pressure is a Privilege": "Athletic, bold, and unapologetic. An illustrated typographic piece perfect for the office, gym, or everyday motivation."
};

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in Backend/.env');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsRef = db.collection('products');

  const [top] = await productsRef.find().sort({ id: -1 }).limit(1).toArray();
  let nextId = (top ? top.id : 0) + 1;

  let added = 0;
  for (const filename of sourceFiles) {
    const srcPath = path.join(sourceDir, filename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Source missing: ${srcPath}`);
      continue;
    }
    
    // Copy the original (we can convert to webp original if needed, but JPG/PNG usually sits in assets and webp in img)
    const baseNameUrl = filename.replace(/\s+/g, '_'); // space safe
    const destOrig = path.join(targetOriginals, baseNameUrl);
    fs.copyFileSync(srcPath, destOrig);
    
    // Create webp variations (which the frontend fetches implicitly via BrushImg.src)
    const baseNoExt = baseNameUrl.replace(/\.png$/i, '');
    const out1080 = path.join(targetThumbs1080, baseNoExt + '.webp');
    const out480 = path.join(targetThumbs480, baseNoExt + '.webp');
    
    // We use macOS built-in "sips" and conversion via cwebp or sips if cwebp isn't available
    // macOS sips can't export directly to webp. Since we just need ANY valid thumbnail, we will use sips->jpeg->rename-to-webp or skip if no cwebp.
    // Actually BrushImg uses webp. Let's see if cwebp exists.
    try {
      execSync(`cwebp -q 80 -resize 1080 0 "${srcPath}" -o "${out1080}"`, { stdio: 'ignore' });
      execSync(`cwebp -q 80 -resize 480 0 "${srcPath}" -o "${out480}"`, { stdio: 'ignore' });
      console.log(`Generated WEBPs for ${filename}`);
    } catch(e) {
       console.log(`cwebp not found or failed, using sips -> jpeg fallback disguised as webp for BrushImg compatibility`);
       const temp1080 = out1080.replace('.webp', '.jpeg');
       const temp480 = out480.replace('.webp', '.jpeg');
       execSync(`sips -Z 1080 -s format jpeg "${srcPath}" --out "${temp1080}"`, { stdio: 'ignore' });
       execSync(`sips -Z 480 -s format jpeg "${srcPath}" --out "${temp480}"`, { stdio: 'ignore' });
       fs.renameSync(temp1080, out1080);
       fs.renameSync(temp480, out480);
    }
    
    const displayName = filename.replace(/\.png/i, '');
    
    const productType = 'poster';
    const cfg = PRODUCT_TYPES[normalizeProductType(productType, category)];
    const id = nextId++;
    const doc = {
      _id: id,
      id: id,
      name: displayName,
      category: category,
      productType: productType,
      price: cfg ? cfg.basePrice : 299,
      originalPrice: (cfg ? cfg.basePrice : 299) * 2, // arbitrary original price based on current prices (299/499)
      pricingSource: cfg ? 'qikink' : undefined,
      badge: 'New',
      description: contentMap[displayName] || 'Premium illustrated typography poster printed on 300 GSM matte paper.',
      stockQuantity: 50,
      keywords: `typography, illustrated, ${displayName.toLowerCase()}`,
      sku: id.toString(),
      image: `assets/Typography/${baseNameUrl}`,
      showInBestsellers: false,
      showInNewArrivals: true,
      showInGrossing: false,
      createdAt: new Date()
    };

    const exId = await productsRef.findOne({ name: displayName });
    if (!exId) {
      await productsRef.insertOne(doc);
      console.log(`Added [${id}] ${displayName} to DB.`);
      added++;
    } else {
      console.log(`Skipped [${displayName}] - already in DB.`);
    }
  }

  console.log(`Done. Added ${added} posters.`);
  await client.close();
}

run().catch(console.error);
