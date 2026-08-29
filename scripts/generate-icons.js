// Regenerates the PWA icon set + favicon from the brand palette.
// Usage: npm i -D sharp && node scripts/generate-icons.js
// Matches docs/get-well/07: primary #E58325, MDI fork-knife brand mark.
const sharp = require('sharp');
const fs = require('fs');

// MDI silverware-fork-knife (same glyph as the app-bar brand, Icon.astro "recipes")
const GLYPH = "M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,6Z";

const PRIMARY = '#E58325';
const PRIMARY_DARK = '#c96e1a';

/**
 * "any" icon: rounded square (20% radius) on transparent, centered glyph.
 * size: canvas px
 */
function anySvg(size) {
  const radius = size * 0.2;
  // glyph occupies ~56% of canvas, centered
  const glyphSize = size * 0.56;
  const scale = glyphSize / 24;
  const offset = (size - glyphSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PRIMARY}"/>
      <stop offset="1" stop-color="${PRIMARY_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path d="${GLYPH}" fill="#ffffff"/>
  </g>
</svg>`;
}

/**
 * maskable icon: full-bleed background; glyph inside the 80% safe zone
 * (content circle r = 40% of canvas).
 */
function maskableSvg(size) {
  const glyphSize = size * 0.5; // comfortably inside the 80% safe circle
  const scale = glyphSize / 24;
  const offset = (size - glyphSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PRIMARY}"/>
      <stop offset="1" stop-color="${PRIMARY_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path d="${GLYPH}" fill="#ffffff"/>
  </g>
</svg>`;
}

async function run() {
  const outDir = process.argv[2] || 'public/icons';
  fs.mkdirSync(outDir, { recursive: true });

  // favicon (any-purpose, scalable)
  fs.writeFileSync('public/favicon.svg', anySvg(512));

  // any-purpose PNGs
  for (const size of [192, 512]) {
    await sharp(Buffer.from(anySvg(size))).png().toFile(`${outDir}/${size}x${size}.png`);
  }
  // maskable PNGs
  for (const size of [192, 512]) {
    await sharp(Buffer.from(maskableSvg(size))).png().toFile(`${outDir}/maskable-${size}x${size}.png`);
  }
  console.log('icons written to', outDir);
}

run().catch((e) => { console.error(e); process.exit(1); });
