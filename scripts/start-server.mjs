import os from 'node:os';
import { exec, spawn } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const spawnOptions = { stdio: 'inherit', shell: process.platform === 'win32' };
const backend = spawn(pnpm, ['--filter', './server', 'dev'], spawnOptions);
const frontend = spawn(pnpm, ['--filter', './client', 'dev'], spawnOptions);
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
