#!/usr/bin/env node
/**
 * Frees the dev and SSR ports, on Windows and on POSIX.
 *
 * `ssr:*` scripts rebuild and then immediately re-listen, so a server left
 * over from the previous run has to go first or the new one dies on EADDRINUSE.
 */
import { execSync } from 'node:child_process';

const PORTS = [4200, 4300, 4400, 4000, 5000];

function pidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      return [
        ...new Set(
          out
            .split('\n')
            .map((line) => line.trim().split(/\s+/).at(-1))
            .filter((pid) => pid && /^\d+$/.test(pid) && pid !== '0'),
        ),
      ];
    }
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

let stopped = 0;
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(Number(pid), 'SIGTERM');
      }
      console.log(`[stop] port ${port} → killed pid ${pid}`);
      stopped += 1;
    } catch {
      console.warn(`[stop] port ${port} → could not kill pid ${pid}`);
    }
  }
}

console.log(stopped === 0 ? '[stop] nothing was listening' : `[stop] stopped ${stopped}`);
