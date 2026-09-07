#!/usr/bin/env node
/**
 * Picks the right build for the Vercel deployment being made, then strips the
 * server output.
 *
 * Every route is prerendered, so the deploy is pure static: leaving the
 * `server/` bundle in place would ship a Node server nothing invokes, and
 * Vercel would still count it against the function bundle size.
 */
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const env = process.env.VERCEL_ENV ?? 'development';
const branch = process.env.VERCEL_GIT_COMMIT_REF ?? '';

function chooseScript() {
  if (env === 'production') {
    return 'build:live';
  }
  if (/^(uat)/i.test(branch)) {
    return 'build:uat';
  }
  if (/^(staging|release)/i.test(branch)) {
    return 'build:staging';
  }
  return 'build:dev';
}

const script = chooseScript();
console.log(`[vercel] VERCEL_ENV=${env} branch=${branch || '(none)'} → npm run ${script}`);
execSync(`npm run ${script}`, { stdio: 'inherit', cwd: ROOT });

const serverDir = resolve(ROOT, 'dist/angular-project-generator/server');
rmSync(serverDir, { recursive: true, force: true });
console.log('[vercel] removed build-time-only server output');
