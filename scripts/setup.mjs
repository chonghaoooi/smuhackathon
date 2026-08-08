import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folders = ['backups', 'logs', 'exports', 'server/data'];
for (const folder of folders) fs.mkdirSync(path.join(root, folder), { recursive: true });

const nodeCheck = spawnSync('node', ['-v'], { stdio: 'inherit', shell: true });
if (nodeCheck.status !== 0) process.exit(nodeCheck.status ?? 1);

const nodeExe = 'C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const pnpmCli = 'C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\pnpm\\bin\\pnpm.mjs';
const env = { ...process.env, PATH: `C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin;${process.env.PATH ?? ''}` };
spawnSync(nodeExe, [pnpmCli, 'install'], { cwd: root, stdio: 'inherit', env });
spawnSync(nodeExe, [pnpmCli, '--filter', './server', 'migrate'], { cwd: root, stdio: 'inherit', env });
spawnSync(nodeExe, [pnpmCli, '--filter', './server', 'seed'], { cwd: root, stdio: 'inherit', env });
