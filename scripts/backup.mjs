import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = path.join(root, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dbPath = path.join(root, 'server', 'data', 'cashbux.db');
const dbCopy = path.join(backupDir, `database_backup_${timestamp}.db`);
fs.copyFileSync(dbPath, dbCopy);
const db = new Database(dbPath);
const snapshot = {
  teams: db.prepare('SELECT * FROM teams').all(),
  companies: db.prepare('SELECT * FROM companies').all(),
  holdings: db.prepare('SELECT * FROM holdings').all(),
  transactions: db.prepare('SELECT * FROM transactions').all(),
  notifications: db.prepare('SELECT * FROM notifications').all()
};
fs.writeFileSync(path.join(backupDir, `snapshot_${timestamp}.json`), JSON.stringify(snapshot, null, 2));
db.close();
console.log('Backup created');
