// Builds the Linux AppImage inside Docker (an AppImage can only be made on Linux, and native
// modules such as koffi must be installed for Linux). Works from Windows with Docker Desktop.
//   node scripts/dist-linux.mjs            -> release/Hyrule-Tracker-<version>-x86_64.AppImage
//   node scripts/dist-linux.mjs --publish  -> also uploads it and latest-linux.yml to the draft
//                                             GitHub release (needs GH_TOKEN; run ensure-release first)
// The repository is copied into the container without node_modules, so the Windows install is never touched.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publish = process.argv.includes('--publish');
if (publish && !process.env.GH_TOKEN) { console.error('[linux] GH_TOKEN is not set.'); process.exit(1); }
mkdirSync(path.join(root, 'release'), { recursive: true });

const mount = (p) => p.replace(/\\/g, '/');
const steps = [
  'set -e',
  'mkdir -p /work && cd /src',
  "tar --exclude=./node_modules --exclude=./release --exclude=./.git --exclude=./dist --exclude=./dist-electron --exclude=./local --exclude=./.playwright-mcp -cf - . | tar -xf - -C /work",
  'cd /work',
  'npm ci --no-audit --no-fund',
  'npm run build',
  `npx electron-builder --linux AppImage --x64 ${publish ? '--publish always' : '--publish never'}`,
  'cp release/*.AppImage /out/',
  'cp release/latest-linux.yml /out/ 2>/dev/null || true',
];
const args = ['run', '--rm',
  '-v', `${mount(root)}:/src:ro`,
  '-v', `${mount(path.join(root, 'release'))}:/out`,
  ...(publish ? ['-e', 'GH_TOKEN'] : []),
  'node:22-bookworm', 'bash', '-c', steps.join(' && ')];
console.log('[linux] building the AppImage in Docker (node:22-bookworm)...');
const run = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(run.status ?? 1);
