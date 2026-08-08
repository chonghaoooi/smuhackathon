import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = path.join(root, 'backups');
const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter(f => f.endsWith('.db')) : [];
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('Select a backup file:');
files.forEach((file, index) => console.log(`${index + 1}. ${file}`));
rl.question('Choice: ', answer => {
  const index = Number(answer) - 1;
  if (!files[index]) process.exit(1);
  fs.copyFileSync(path.join(backupDir, files[index]), path.join(root, 'server/data/cashbux.db'));
  console.log('Restored');
  rl.close();
});
