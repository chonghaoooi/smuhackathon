import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folders = ['backups', 'logs', 'exports', 'server/data'];
for (const folder of folders) fs.mkdirSync(path.join(root, folder), { recursive: true });

const nodeCheck = spawnSync('node', ['-v'], { stdio: 'inherit', shell: true });
if (nodeCheck.status !== 0) process.exit(nodeCheck.status ?? 1);

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
for (const args of [['install'], ['--filter', './server', 'migrate'], ['--filter', './server', 'seed']]) {
  const result = spawnSync(pnpm, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
