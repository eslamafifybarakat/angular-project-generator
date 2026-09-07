#!/usr/bin/env node
/**
 * Renders the favicon and PWA icon set from the SVG marks via sharp.
 *
 * The SVGs are the source of truth and the only files a designer edits; every
 * raster size here is derived, so the set cannot drift out of step with the
 * brand mark.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC = resolve(ROOT, 'public');

const OUTPUTS = [
  { source: 'mark-color.svg', out: 'icon-192.png', size: 192 },
  { source: 'mark-color.svg', out: 'icon-512.png', size: 512 },
  { source: 'mark-color.svg', out: 'apple-touch-icon.png', size: 180 },
  // Maskable icons need the mark inside the safe zone, so it is padded rather
  // than simply scaled: a full-bleed mark gets its corners cropped on Android.
  { source: 'mark-color.svg', out: 'icon-512-maskable.png', size: 512, padding: 0.2 },
];

for (const target of OUTPUTS) {
  const svg = await readFile(resolve(PUBLIC, target.source));
  const padding = target.padding ?? 0;
  const inner = Math.round(target.size * (1 - padding));
  const offset = Math.round((target.size - inner) / 2);

  const rendered = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: 'contain', background: { r: 43, g: 89, b: 240, alpha: 1 } })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: target.size,
      height: target.size,
      channels: 4,
      background: padding > 0 ? { r: 43, g: 89, b: 240, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const buffer = await canvas
    .composite([{ input: rendered, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(resolve(PUBLIC, target.out), buffer);
  console.log(`[icons] ${target.out} (${target.size}px)`);
}

// favicon.ico: 32px PNG payload, which every current browser accepts.
const ico = await sharp(await readFile(resolve(PUBLIC, 'favicon.svg')), { density: 384 })
  .resize(32, 32)
  .png()
  .toBuffer();
await writeFile(resolve(PUBLIC, 'favicon.ico'), ico);
console.log('[icons] favicon.ico (32px)');
