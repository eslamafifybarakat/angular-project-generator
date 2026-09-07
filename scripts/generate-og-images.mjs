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

const MARGIN_X = 72;
const TEXT_WIDTH = WIDTH - MARGIN_X * 2;

/**
 * Greedy word-wrap using an average-glyph-width estimate rather than real
 * text measurement — sharp/librsvg has no layout engine to ask. Figtree is
 * proportional, so this is approximate, but conservative enough that no
 * known title/subtitle in the catalog overflows the card.
 */
function wrap(text, fontSize, weightFactor, maxLines) {
  const avgCharWidth = fontSize * weightFactor;
  const maxChars = Math.max(1, Math.floor(TEXT_WIDTH / avgCharWidth));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length <= maxLines) {
    return lines;
  }
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1].slice(0, Math.max(0, maxChars - 1));
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

function card(title, subtitle) {
  const titleLines = wrap(title, 64, 0.56, 2);
  const subtitleLines = wrap(subtitle, 30, 0.52, 3);

  const TITLE_LINE_HEIGHT = 74;
  const SUBTITLE_LINE_HEIGHT = 40;
  const BLOCK_GAP = 60;

  const titleY0 = 300;
  const subtitleY0 = titleY0 + (titleLines.length - 1) * TITLE_LINE_HEIGHT + BLOCK_GAP;
  const lastSubtitleY = subtitleY0 + (subtitleLines.length - 1) * SUBTITLE_LINE_HEIGHT;
  const barY = Math.min(lastSubtitleY + BLOCK_GAP, HEIGHT - 50);

  const titleTspans = titleLines
    .map((line, i) => `<tspan x="${MARGIN_X}" y="${titleY0 + i * TITLE_LINE_HEIGHT}">${escapeXml(line)}</tspan>`)
    .join('');
  const subtitleTspans = subtitleLines
    .map(
      (line, i) =>
        `<tspan x="${MARGIN_X}" y="${subtitleY0 + i * SUBTITLE_LINE_HEIGHT}">${escapeXml(line)}</tspan>`,
    )
    .join('');

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
  <text font-family="Figtree, sans-serif" font-size="64" font-weight="700" fill="#E8EEF7">${titleTspans}</text>
  <text font-family="Figtree, sans-serif" font-size="30" fill="#9DAABC">${subtitleTspans}</text>
  <rect x="72" y="${barY}" width="220" height="6" rx="3" fill="#3CC3B2"/>
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
const heroTitle = catalog['angular_project_generator_app_hero_title'];
await render('default', heroTitle, catalog['angular_project_generator_app_hero_body']);

// Preset cards carry the same brand headline as the default card — one
// consistent title across every share image — and use the preset's own
// name + description as the distinguishing subtitle underneath, rather
// than as the title. `nameKey`/`descriptionKey` themselves are untouched
// here: they're also the labels shown on the preset picker in the
// dashboard, so this reads them, it doesn't repurpose them.
for (const preset of presets.data) {
  const name = catalog[preset.nameKey] ?? preset.id;
  const description = catalog[preset.descriptionKey] ?? '';
  await render(preset.id, heroTitle, description ? `${name}: ${description}` : name);
}
