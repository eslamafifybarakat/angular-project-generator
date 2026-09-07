#!/usr/bin/env node
/**
 * Runs a build command behind a PID-checked lock file.
 *
 * Two builds writing the same `dist/` at once produce an output that matches
 * neither. The lock records the owning PID, so a lock left behind by a killed
 * process is detected as stale and reclaimed rather than blocking every later
 * build until someone deletes it by hand.
 */
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LOCK = resolve(ROOT, '.build.lock');
const command = process.argv.slice(2).join(' ');

if (!command) {
  console.error('[lock] no command given');
  process.exit(1);
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

if (existsSync(LOCK)) {
  const owner = Number.parseInt(readFileSync(LOCK, 'utf8').trim(), 10);
  if (Number.isFinite(owner) && isRunning(owner)) {
    console.error(`[lock] a build is already running (pid ${owner}). Aborting.`);
    process.exit(1);
  }
  console.warn(`[lock] clearing stale lock from pid ${owner}`);
  rmSync(LOCK, { force: true });
}

writeFileSync(LOCK, String(process.pid), 'utf8');

function release() {
  rmSync(LOCK, { force: true });
}

process.on('SIGINT', () => {
  release();
  process.exit(130);
});
process.on('SIGTERM', () => {
  release();
  process.exit(143);
});

const child = spawn(command, { stdio: 'inherit', shell: true });
child.on('exit', (code) => {
  release();
  process.exit(code ?? 0);
});
