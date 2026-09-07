#!/usr/bin/env node
/**
 * Turns LIGHTHOUSE.md into a printable PDF via headless Chrome.
 *
 * The narrative in this report is generated from the table that was actually
 * measured — nothing is carried over from another project's audit. Prose about
 * "outliers investigated" or "regressions fixed this session" describes real
 * events from one specific run; reusing it elsewhere would be inventing
 * findings that never happened.
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from 'chrome-launcher';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, 'LIGHTHOUSE.md');
const OUT = resolve(ROOT, 'AUDIT.pdf');
const TEMP_HTML = resolve(ROOT, '.audit.tmp.html');

if (!existsSync(SOURCE)) {
  console.error('[audit] LIGHTHOUSE.md not found. Run `npm run lighthouse` first.');
  process.exit(1);
}

const markdown = await readFile(SOURCE, 'utf8');
const rows = markdown
  .split('\n')
  .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.includes('| Device |'))
  .map((line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/`/g, '')),
  );

const numeric = rows.map((cells) => cells.slice(3, 7).map(Number));
const flat = numeric.flat().filter((n) => Number.isFinite(n));
const lowest = flat.length > 0 ? Math.min(...flat) : 0;
const belowTarget = rows.filter((cells) =>
  cells.slice(3, 7).some((cell) => Number(cell) < 90),
).length;

/**
 * Every sentence below is a statement about the numbers in the table above it.
 * If the table is empty, the summary says so rather than asserting anything.
 */
const summary =
  rows.length === 0
    ? 'No audit rows were found in LIGHTHOUSE.md, so this report states no results.'
    : belowTarget === 0
      ? `All ${rows.length} runs met the 90 threshold in every category. The lowest single ` +
        `category score recorded was ${lowest}.`
      : `${belowTarget} of ${rows.length} runs fell below 90 in at least one category. The ` +
        `lowest single category score recorded was ${lowest}. Each is listed in ` +
        'LIGHTHOUSE.md and should be root-caused rather than accepted.';

const tableHtml = rows
  .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
  .join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Angular Project Generator — audit</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font: 11pt/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f1723; }
  h1 { font-size: 21pt; margin: 0 0 4mm; letter-spacing: -0.02em; }
  .meta { color: #56637a; font-size: 9.5pt; margin-bottom: 8mm; }
  .summary { padding: 5mm; background: #f4f6fa; border-inline-start: 3px solid #2b59f0;
             border-radius: 3px; margin-bottom: 8mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th, td { padding: 2mm 2.4mm; border-bottom: 1px solid #dbe2ed; text-align: left; }
  th { background: #eef2f8; font-weight: 620; }
  td:nth-child(n+4):nth-child(-n+7) { font-variant-numeric: tabular-nums; }
</style></head>
<body>
  <h1>Angular Project Generator — Lighthouse audit</h1>
  <p class="meta">Rendered from LIGHTHOUSE.md · ${new Date().toISOString()}</p>
  <div class="summary">${summary}</div>
  <table>
    <thead><tr>
      <th>Device</th><th>Theme</th><th>Route</th><th>Perf</th><th>A11y</th>
      <th>Best practices</th><th>SEO</th><th>LCP</th><th>CLS</th><th>TBT</th>
    </tr></thead>
    <tbody>${tableHtml}</tbody>
  </table>
</body></html>`;

await writeFile(TEMP_HTML, html, 'utf8');

const chrome = await launch({
  chromeFlags: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--print-to-pdf=${OUT}`,
    '--no-pdf-header-footer',
    `file://${TEMP_HTML}`,
  ],
});

await new Promise((done) => setTimeout(done, 1500));
await chrome.kill();
await unlink(TEMP_HTML);

console.log(`[audit] wrote ${OUT}`);
