#!/usr/bin/env node
/**
 * Removes build output. `node scripts/clean.mjs dist` or `... cache` narrows
 * it; with no argument both go.
 */
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = {
  dist: ['dist'],
  cache: ['.angular/cache'],
};

const requested = process.argv[2];
const paths =
  requested && TARGETS[requested]
    ? TARGETS[requested]
    : [...TARGETS.dist, ...TARGETS.cache, 'out-tsc'];

for (const relative of paths) {
  const target = resolve(ROOT, relative);
  await rm(target, { recursive: true, force: true });
  console.log(`[clean] removed ${relative}`);
}
