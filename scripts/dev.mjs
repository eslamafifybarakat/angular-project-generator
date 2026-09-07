#!/usr/bin/env node
/**
 * Starts `ng serve`, resolving the build configuration and port from the npm
 * script that invoked it.
 *
 * `npm run dev:4300` should not need its own argument list — the script name
 * already says what it wants, so the mapping lives here instead of being
 * duplicated across six package.json entries.
 */
import { spawn } from 'node:child_process';

const PORT_BY_SCRIPT = {
  'dev:4200': 4200,
  'dev:4300': 4300,
  'start:staging': 4300,
  'start:uat': 4300,
  'start:live': 4400,
};

const CONFIGURATION_BY_SCRIPT = {
  'start:staging': 'staging',
  'start:uat': 'uat',
  'start:live': 'production',
};

const scriptName = process.env.npm_lifecycle_event ?? 'dev';
const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

const configuration =
  flagValue('configuration') ?? CONFIGURATION_BY_SCRIPT[scriptName] ?? 'development';
const port = Number(flagValue('port') ?? PORT_BY_SCRIPT[scriptName] ?? 4200);

const args = ['ng', 'serve', '--configuration', configuration, '--port', String(port)];
console.log(`[dev] ${scriptName} → ng serve --configuration ${configuration} --port ${port}`);

const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
