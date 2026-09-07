#!/usr/bin/env node
/**
 * Renders Open Graph share images from seed data.
 *
 * The seed is read through a JSON import attribute, never from the compiled
 * `.data.ts` module: plain Node cannot execute TypeScript without a loader, so
 * importing the `.ts` file would work in the editor and fail in CI.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import presets from '../src/app/domains/project-generator/infrastructure/data/presets.json' with { type: 'json' };

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/og');
const WIDTH = 1200;
const HEIGHT = 630;

await mkdir(OUT, { recursive: true });

function escapeXml(value) {
  return value.replace(
    /[<>&'"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char],
  );
}

function card(title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0F16"/>
      <stop offset="100%" stop-color="#16213A"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="72" y="72" width="56" height="56" rx="15" fill="#2B59F0"/>
  <path d="M86 116 100 88l14 28" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round"/>
  <text x="152" y="110" font-family="Figtree, sans-serif" font-size="26" font-weight="600" fill="#9DAABC">
    Angular Project Generator
  </text>
  <text x="72" y="330" font-family="Figtree, sans-serif" font-size="68" font-weight="700" fill="#E8EEF7">
    ${escapeXml(title)}
  </text>
  <text x="72" y="400" font-family="Figtree, sans-serif" font-size="32" fill="#9DAABC">
    ${escapeXml(subtitle)}
  </text>
  <rect x="72" y="520" width="220" height="6" rx="3" fill="#3CC3B2"/>
</svg>`;
}

async function render(name, title, subtitle) {
  const png = await sharp(Buffer.from(card(title, subtitle)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(OUT, `${name}.png`), png);
  console.log(`[og] ${name}.png`);
}

// The default card's copy comes from the English catalog, so the share image
// and the page it links to say the same thing.
const catalog = JSON.parse(await readFile(resolve(ROOT, 'src/locales/en.json'), 'utf8'));
await render('default', catalog['app.heroTitle'], catalog['app.appSub']);

for (const preset of presets.data) {
  await render(preset.id, catalog[preset.nameKey] ?? preset.id, catalog[preset.descriptionKey] ?? '');
}
