#!/usr/bin/env node
/**
 * Starts the compiled SSR server on a chosen port.
 *
 * Fails loudly with the build command to run when the bundle is missing —
 * `serve:ssr:*` after a `clean` is the common way to hit that.
 */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SERVER = resolve(ROOT, 'dist/angular-project-generator/server/server.mjs');

const argv = process.argv.slice(2);
const portIndex = argv.indexOf('--port');
const port = portIndex >= 0 ? argv[portIndex + 1] : '4000';

if (!existsSync(SERVER)) {
  console.error('[ssr] no server bundle found at dist/angular-project-generator/server.');
  console.error('[ssr] run `npm run build` (or `npm run build:dev`) first.');
  process.exit(1);
}

console.log(`[ssr] http://localhost:${port}`);
const child = spawn(process.execPath, [SERVER], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
});
child.on('exit', (code) => process.exit(code ?? 0));
