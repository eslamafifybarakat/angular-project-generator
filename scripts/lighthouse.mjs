#!/usr/bin/env node
/**
 * Runs real Lighthouse audits against the production build and writes
 * LIGHTHOUSE.md.
 *
 * Two things here are deliberate and easy to get wrong:
 *
 *  1. The static server applies the same headers vercel.json declares, per
 *     path. Auditing without them measures a site nobody will ever visit.
 *  2. Throttling is set explicitly per device. Lighthouse's defaults do not
 *     loosen automatically for `formFactor: 'desktop'`, so an unparameterized
 *     run can score desktop *worse* than mobile and send you chasing a
 *     regression that does not exist.
 *
 * Usage: npm run lighthouse -- --devices=mobile,desktop [--port 4321]
 */
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const ROOT = resolve(import.meta.dirname, '..');
const BROWSER = resolve(ROOT, 'dist/angular-project-generator/browser');

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) {
    return withEquals.split('=').slice(1).join('=');
  }
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

const devices = flag('devices', 'mobile,desktop').split(',');
const port = Number(flag('port', '4321'));
const routes = flag('routes', '/,/new/project,/new/review,/ar,/ar/new/theme').split(',');
const themes = flag('themes', 'light,dark').split(',');

if (!existsSync(BROWSER)) {
  console.error('[lighthouse] no production build found. Run `npm run build` first.');
  process.exit(1);
}

// Explicit per-device throttling. These are the standard Lighthouse presets,
// stated rather than assumed.
const THROTTLING = {
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
    },
  },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const vercel = JSON.parse(await readFile(resolve(ROOT, 'vercel.json'), 'utf8'));

function headersFor(pathname) {
  const applied = {};
  for (const rule of vercel.headers ?? []) {
    if (matches(rule.source, pathname)) {
      for (const entry of rule.headers ?? []) {
        applied[entry.key] = entry.value;
      }
    }
  }
  return applied;
}

/** Enough of Vercel's source syntax for the patterns this project uses. */
function matches(source, pathname) {
  if (source === '/(.*)' || source === '/:path*') {
    return true;
  }
  const pattern = source
    .replace(/\(\.\*\)/g, '.*')
    .replace(/:[a-zA-Z]+\*/g, '.*')
    .replace(/\./g, '\\.')
    .replace(/\\\.\\\*/g, '.*');
  try {
    return new RegExp(`^${pattern}$`).test(pathname);
  } catch {
    return false;
  }
}

async function resolveFile(pathname) {
  const clean = pathname.split('?')[0];
  const direct = join(BROWSER, clean);
  try {
    const info = await stat(direct);
    if (info.isFile()) {
      return direct;
    }
    if (info.isDirectory()) {
      return join(direct, 'index.html');
    }
  } catch {
    /* fall through */
  }
  const asIndex = join(BROWSER, clean, 'index.html');
  return existsSync(asIndex) ? asIndex : join(BROWSER, '404/index.html');
}

const server = createServer((req, res) => {
  void (async () => {
    const file = await resolveFile(req.url ?? '/');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      ...headersFor(req.url ?? '/'),
    });
    createReadStream(file).pipe(res);
  })();
});

await new Promise((done) => server.listen(port, done));
console.log(`[lighthouse] serving the production build on http://localhost:${port}`);

const chrome = await launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const results = [];

try {
  for (const device of devices) {
    const profile = THROTTLING[device];
    if (!profile) {
      console.warn(`[lighthouse] unknown device "${device}", skipping`);
      continue;
    }
    for (const theme of themes) {
      for (const route of routes) {
        // The theme is forced through the same key the app reads, so the audit
        // measures the theme it claims to.
        const url = `http://localhost:${port}${route}?theme=${theme}`;
        const run = await lighthouse(
          url,
          { port: chrome.port, output: 'json', logLevel: 'error' },
          {
            extends: 'lighthouse:default',
            settings: { ...profile, onlyCategories: CATEGORIES, emulatedUserAgent: false },
          },
        );
        const scores = Object.fromEntries(
          CATEGORIES.map((key) => [key, Math.round((run.lhr.categories[key]?.score ?? 0) * 100)]),
        );
        results.push({ route, theme, device, scores, metrics: {
          lcp: run.lhr.audits['largest-contentful-paint']?.displayValue ?? '—',
          cls: run.lhr.audits['cumulative-layout-shift']?.displayValue ?? '—',
          tbt: run.lhr.audits['total-blocking-time']?.displayValue ?? '—',
        } });
        console.log(
          `[lighthouse] ${device}/${theme}${route} → ` +
            CATEGORIES.map((key) => `${key[0].toUpperCase()}${scores[key]}`).join(' '),
        );
      }
    }
  }
} finally {
  await chrome.kill();
  server.close();
}

const failures = results.filter((row) => CATEGORIES.some((key) => row.scores[key] < 90));

const lines = [
  '# Lighthouse',
  '',
  `Generated by \`npm run lighthouse\` on ${new Date().toISOString()}.`,
  '',
  `Devices: ${devices.join(', ')} · themes: ${themes.join(', ')} · ${results.length} runs.`,
  'Throttling profiles are set explicitly per device — see scripts/lighthouse.mjs.',
  '',
  '| Device | Theme | Route | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...results.map(
    (row) =>
      `| ${row.device} | ${row.theme} | \`${row.route}\` | ${row.scores.performance} | ` +
      `${row.scores.accessibility} | ${row.scores['best-practices']} | ${row.scores.seo} | ` +
      `${row.metrics.lcp} | ${row.metrics.cls} | ${row.metrics.tbt} |`,
  ),
  '',
  failures.length === 0 ? 'Every run scored 90 or above in all four categories.' : '',
].filter(Boolean);

if (failures.length > 0) {
  lines.push(
    `## ${failures.length} run(s) below 90`,
    '',
    'Treat each of these as a bug to root-cause, not as an acceptable number.',
    '',
    ...failures.map(
      (row) =>
        `- \`${row.device}/${row.theme}${row.route}\`: ` +
        CATEGORIES.filter((key) => row.scores[key] < 90)
          .map((key) => `${key} ${row.scores[key]}`)
          .join(', '),
    ),
  );
}

await mkdir(ROOT, { recursive: true });
await writeFile(resolve(ROOT, 'LIGHTHOUSE.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(`[lighthouse] wrote LIGHTHOUSE.md (${results.length} runs, ${failures.length} below 90)`);
process.exit(failures.length > 0 ? 1 : 0);
