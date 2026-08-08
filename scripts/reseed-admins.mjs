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
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const admins = [
  ['KevanDaGoat67', 'KevanDaGoat67'],
  ["WeWantBigWee'sWeeWee", "WeWantBigWee'sWeeWee"]
];

const now = new Date().toISOString();
for (const [username, password] of admins) {
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  const passwordHash = bcrypt.hashSync(password, 10);
  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
  } else {
    db.prepare('INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(randomUUID(), username, passwordHash, now);
  }
}

db.close();
console.log('Admin accounts reseeded');
