/**
 * Generate PNG icons from SVG favicon
 * Run with: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Read the SVG
const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

// Icon sizes to generate
const icons = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

// Generate OG image (1200x630 with centered logo)
async function generateOgImage() {
  const logoSize = 200;
  const logo = await sharp(svgBuffer)
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();

  // Create gradient background with logo
  const ogImage = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 2, g: 6, b: 23, alpha: 1 }, // #020617
    },
  })
    .composite([
      {
        input: logo,
        top: Math.round((630 - logoSize) / 2),
        left: Math.round((1200 - logoSize) / 2),
      },
    ])
    .png()
    .toFile(join(publicDir, 'og-image.png'));

  console.log('Generated: og-image.png (1200x630)');
}

// Generate all icons
async function generateIcons() {
  for (const icon of icons) {
    await sharp(svgBuffer)
      .resize(icon.size, icon.size)
      .png()
      .toFile(join(publicDir, icon.name));

    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }
}

async function main() {
  console.log('Generating icons from favicon.svg...\n');

  await generateIcons();
  await generateOgImage();

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
