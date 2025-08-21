

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZES = [
  { size: 512, name: 'icon-512x512.png', purpose: 'any' },
  { size: 192, name: 'icon-192x192.png', purpose: 'any' },
  { size: 180, name: 'apple-touch-icon.png', purpose: 'maskable' },
  { size: 32, name: 'favicon-32x32.png', purpose: 'any' },
  { size: 16, name: 'favicon-16x16.png', purpose: 'any' },
];

const publicDir = path.join(process.cwd(), 'public');
const sourceImagePath = path.join(publicDir, 'CentseiLogo.png');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(sourceImagePath)) {
    console.error(`Error: Source image not found at ${sourceImagePath}`);
    process.exit(1);
}

async function generate() {
  const manifestIcons = [];
  
  for (const { size, name, purpose } of SIZES) {
    const outputPath = path.join(publicDir, name);
    await sharp(sourceImagePath)
      .resize(size, size)
      .toFile(outputPath);
      
    console.log(`Generated ${name}`);
    
    manifestIcons.push({
      src: `/${name}`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: purpose,
    });
  }
  
  const manifest = {
    name: 'Centsei',
    short_name: 'Centsei',
    description: 'Your personal finance sensei',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#d02f27',
    icons: manifestIcons,
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Generated manifest.json');
}

generate().catch(console.error);
