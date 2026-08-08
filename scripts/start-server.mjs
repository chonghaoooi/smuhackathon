import os from 'node:os';
import { exec, spawn } from 'node:child_process';

const nodeExe = 'C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const pnpmCli = 'C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\pnpm\\bin\\pnpm.mjs';
const env = { ...process.env, PATH: `C:\\Users\\amarn\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin;${process.env.PATH ?? ''}` };
const backend = spawn(nodeExe, [pnpmCli, '--filter', './server', 'dev'], { env, stdio: 'inherit' });
const frontend = spawn(nodeExe, [pnpmCli, '--filter', './client', 'dev'], { env, stdio: 'inherit' });
const localUrl = `http://${getIp()}:3000`;

function getIp() {
  const nets = os.networkInterfaces();
  for (const [name, interfaces] of Object.entries(nets)) {
    if (/wifi|wireless|wlan/i.test(name)) {
      for (const net of interfaces ?? []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  }
  for (const interfaces of Object.values(nets)) {
    for (const net of interfaces ?? []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('192.168.56.')) return net.address;
    }
  }
  return '127.0.0.1';
}

console.log(`Server running at:\n${localUrl}`);
exec(`cmd /c start "" "${localUrl}"`);

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
