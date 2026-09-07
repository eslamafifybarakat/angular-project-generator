#!/usr/bin/env node
/**
 * Rewrites vercel.json's CSP `script-src` to the exact set of hashes present
 * in the build that was just produced.
 *
 * Hashes are computed from the real prerendered HTML every time. A stale
 * hardcoded hash is worse than none: the inline theme script silently stops
 * running and the page flashes the wrong theme on every load.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BROWSER = resolve(ROOT, 'dist/angular-project-generator/browser');
const VERCEL_JSON = resolve(ROOT, 'vercel.json');

if (!existsSync(BROWSER)) {
  console.error('[csp] no prerendered output found. Run a build first.');
  process.exit(1);
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await htmlFiles(full)));
    } else if (entry.name.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

function sha256(source) {
  return `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

const scriptHashes = new Set();
const handlerHashes = new Set();

for (const file of await htmlFiles(BROWSER)) {
  const html = await readFile(file, 'utf8');

  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    const source = match[1];
    if (source.trim().length === 0) {
      continue;
    }
    scriptHashes.add(sha256(source));
  }

  // Inline event handlers are hashed too. Angular's own deferred-stylesheet
  // link ships an `onload` attribute, so a policy of hashes alone would block
  // it and the page would render unstyled until hydration. Handler hashes need
  // 'unsafe-hashes' to be honoured — that keyword permits *these* exact
  // handler bodies, not arbitrary inline script.
  for (const match of html.matchAll(/\son[a-z]+\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const body = match[2] ?? match[3] ?? '';
    if (body.trim().length > 0) {
      handlerHashes.add(sha256(body));
    }
  }
}

const config = JSON.parse(await readFile(VERCEL_JSON, 'utf8'));
const scriptSrc = [
  "'self'",
  ...(handlerHashes.size > 0 ? ["'unsafe-hashes'"] : []),
  ...[...scriptHashes].sort(),
  ...[...handlerHashes].sort(),
].join(' ');

let rewritten = 0;
for (const header of config.headers ?? []) {
  for (const entry of header.headers ?? []) {
    if (entry.key !== 'Content-Security-Policy') {
      continue;
    }
    entry.value = entry.value
      .split(';')
      .map((part) => (part.trim().startsWith('script-src') ? ` script-src ${scriptSrc}` : part))
      .join(';');
    rewritten += 1;
  }
}

await writeFile(VERCEL_JSON, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(
  `[csp] ${scriptHashes.size} inline script hash(es) + ${handlerHashes.size} event-handler ` +
    `hash(es) → ${rewritten} CSP header(s) updated`,
);
