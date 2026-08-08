import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve('server/data/cashbux.db');
console.log(fs.existsSync(dbPath) ? 'Database: OK' : 'Database: Missing');
