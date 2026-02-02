import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Read the SVG files
const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'));
const logoSvg = readFileSync(join(publicDir, 'verbs-collected-logo.svg'));

// Generate favicon PNGs from favicon.svg
async function generateFavicons() {
  const sizes = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-192.png', size: 192 },
    { name: 'favicon-512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    await sharp(faviconSvg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
}

// Generate OG image (1200x630) with logo centered on black background
async function generateOgImage() {
  const width = 1200;
  const height = 630;

  // The logo is 844.54 x 297.67 - scale to fit nicely with padding
  // Target about 60% of width = 720px wide
  const logoWidth = 720;
  const logoHeight = Math.round(logoWidth * (297.67 / 844.54)); // ~254px

  // Create the logo with white fill (original is black)
  // The SVG uses inline styles, path fills default to black, and has a circle with stroke
  let logoSvgStr = logoSvg.toString();

  // Add a default white fill to the root SVG and override black strokes
  // Insert fill="white" and style override after the opening svg tag
  logoSvgStr = logoSvgStr.replace(
    /<svg([^>]*)>/,
    '<svg$1 style="fill: white;"><style>path { fill: white !important; } circle { stroke: white !important; }</style>'
  );

  // Render the logo
  const logoBuffer = await sharp(Buffer.from(logoSvgStr), { density: 300 })
    .resize(logoWidth, logoHeight)
    .png()
    .toBuffer();

  // Create black background and composite the logo centered
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([{
      input: logoBuffer,
      left: Math.round((width - logoWidth) / 2),
      top: Math.round((height - logoHeight) / 2)
    }])
    .png()
    .toFile(join(publicDir, 'og-image.png'));

  console.log('Generated og-image.png (1200x630)');
}

// Run
await generateFavicons();
await generateOgImage();
console.log('Done!');
