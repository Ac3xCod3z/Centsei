

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="black"/>
  <circle cx="256" cy="256" r="200" fill="white"/>
  <path d="M106 140H156V110H356V140H406V160H106V140Z" fill="#D02F27"/>
  <path d="M166 170H346V350H306V210H206V350H166V170Z" fill="#D02F27"/>
  <path d="M136 360H376V400H136V360Z" fill="#D02F27"/>
</svg>
`;

const SIZES = [
  { size: 512, name: 'icon-512x512.png', purpose: 'any' },
  { size: 192, name: 'icon-192x192.png', purpose: 'any' },
  { size: 180, name: 'apple-touch-icon.png', purpose: 'maskable' },
  { size: 32, name: 'favicon-32x32.png', purpose: 'any' },
  { size: 16, name: 'favicon-16x16.png', purpose: 'any' },
];

const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  const manifestIcons = [];
  
  for (const { size, name, purpose } of SIZES) {
    const outputPath = path.join(publicDir, name);
    await sharp(Buffer.from(svgIcon))
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
