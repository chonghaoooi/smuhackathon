import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'server', 'data', 'cashbux.db');
if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const require = createRequire(path.join(root, 'server', 'src', 'index.ts'));
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database(dbPath);
const players = Array.from({ length: 7 }, (_, index) => {
  const number = index + 1;
  return {
    name: `Team ${number}`,
    username: `team${number}`,
    password: `team${number}123`
  };
});

for (const player of players) {
  const passwordHash = bcrypt.hashSync(player.password, 10);
  const existing = db.prepare('SELECT id FROM teams WHERE username = ?').get(player.username);
  if (existing) {
    db.prepare('UPDATE teams SET name = ?, password_hash = ? WHERE username = ?').run(player.name, passwordHash, player.username);
  } else {
    db.prepare('INSERT INTO teams (id, name, username, password_hash, cash) VALUES (?, ?, ?, ?, 5000)').run(randomUUID(), player.name, player.username, passwordHash);
  }
}

db.close();
console.log('Player accounts reseeded');
