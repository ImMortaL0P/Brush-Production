const Jimp = require('/Users/mangalam/.local/lib/node_modules/jimp');

async function process() {
  const image = await Jimp.read('public/Brush Text Arial.png');
  const width = image.getWidth();
  const height = image.getHeight();
  const size = Math.max(width, height);
  
  new Jimp(size, size, 0x00000000, (err, bg) => {
    if (err) throw err;
    const x = Math.floor((size - width) / 2);
    const y = Math.floor((size - height) / 2);
    bg.composite(image, x, y);
    // Resize down to 256x256 for a proper favicon size (saves bandwidth)
    bg.resize(256, 256);
    bg.write('public/favicon.png');
    console.log('Saved favicon.png');
  });
}

process();
