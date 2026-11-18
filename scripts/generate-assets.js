const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/KaaviyaDharun/.gemini/antigravity/brain/cfe411b1-9196-4d48-baf0-ccc36c256ab2/.user_uploaded/media_1794896276344_066a12ad.png';
const publicDir = path.resolve(__dirname, '../public');
const appDir = path.resolve(__dirname, '../src/app');

async function generateAssets() {
  console.log('Reading source image:', srcPath);
  
  if (!fs.existsSync(srcPath)) {
    throw new Error('Source file not found at: ' + srcPath);
  }

  // 1. Full original logo copy
  await sharp(srcPath).png().toFile(path.join(publicDir, 'sensilearn-logo.png'));
  console.log('Created sensilearn-logo.png (1024x1024)');

  // 2. Extract trimmed logo (bounding box: minX 307, minY 331, w 410, h 220)
  const trimmedBuffer = await sharp(srcPath)
    .extract({ left: 307, top: 331, width: 410, height: 220 })
    .png()
    .toBuffer();

  await sharp(trimmedBuffer).toFile(path.join(publicDir, 'sensilearn-logo-mark.png'));
  console.log('Created sensilearn-logo-mark.png (410x220)');

  // Function to create a centered square icon with transparent background
  async function createSquareIcon(size, paddingRatio = 0.08) {
    const targetW = Math.round(size * (1 - paddingRatio * 2));
    const targetH = Math.round(targetW * (220 / 410));
    
    const resizedLogo = await sharp(trimmedBuffer)
      .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png();
  }

  // 3. Square full-size logo (512x512)
  const square512 = await (await createSquareIcon(512, 0.08)).toBuffer();
  await sharp(square512).toFile(path.join(publicDir, 'sensilearn-logo-square.png'));
  await sharp(square512).toFile(path.join(publicDir, 'favicon.png'));
  await sharp(square512).toFile(path.join(publicDir, 'android-chrome-512x512.png'));
  await sharp(square512).toFile(path.join(appDir, 'icon.png'));
  console.log('Created 512x512 square assets and src/app/icon.png');

  // 4. Android 192x192
  const square192 = await (await createSquareIcon(192, 0.08)).toBuffer();
  await sharp(square192).toFile(path.join(publicDir, 'android-chrome-192x192.png'));
  console.log('Created android-chrome-192x192.png (192x192)');

  // 5. Apple Touch Icon 180x180
  const appleTouch = await (await createSquareIcon(180, 0.08)).toBuffer();
  await sharp(appleTouch).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(appleTouch).toFile(path.join(appDir, 'apple-icon.png'));
  console.log('Created apple-touch-icon.png (180x180) and src/app/apple-icon.png');

  // 6. Favicons 48x48, 32x32, 16x16
  const fav48Buffer = await (await createSquareIcon(48, 0.06)).toBuffer();
  const fav32Buffer = await (await createSquareIcon(32, 0.05)).toBuffer();
  const fav16Buffer = await (await createSquareIcon(16, 0.04)).toBuffer();

  await sharp(fav48Buffer).toFile(path.join(publicDir, 'favicon-48x48.png'));
  await sharp(fav32Buffer).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(fav16Buffer).toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('Created favicon-48x48.png, favicon-32x32.png, favicon-16x16.png');

  // 7. Multi-resolution ICO (16x16, 32x32, 48x48)
  function buildIco(images) {
    const numImages = images.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    let offset = headerSize + dirEntrySize * numImages;

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type 1 = ICO
    header.writeUInt16LE(numImages, 4); // count

    const entries = [];
    for (const img of images) {
      const entry = Buffer.alloc(dirEntrySize);
      entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
      entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
      entry.writeUInt8(0, 2); // color count
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // color planes
      entry.writeUInt16LE(32, 6); // bpp
      entry.writeUInt32LE(img.buffer.length, 8); // size in bytes
      entry.writeUInt32LE(offset, 12); // offset
      entries.push(entry);
      offset += img.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images.map(i => i.buffer)]);
  }

  const icoBuffer = buildIco([
    { width: 16, height: 16, buffer: fav16Buffer },
    { width: 32, height: 32, buffer: fav32Buffer },
    { width: 48, height: 48, buffer: fav48Buffer }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico in public/ and src/app/');

  // 8. favicon.svg
  const trimmedB64 = trimmedBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 410 220" width="100%" height="100%">
  <image width="410" height="220" href="data:image/png;base64,${trimmedB64}" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
  console.log('Created favicon.svg');
}

generateAssets().then(() => console.log('All assets generated successfully!')).catch(console.error);
