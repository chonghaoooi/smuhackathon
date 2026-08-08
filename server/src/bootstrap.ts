import { db, initDb } from './db.js';
import { seedCompanyProfiles } from './routes.js';

export function isFirstRun() {
  const teamCount = db.prepare('SELECT COUNT(*) AS count FROM teams').get() as { count: number };
  const companyCount = db.prepare('SELECT COUNT(*) AS count FROM companies').get() as { count: number };
  return teamCount.count === 0 || companyCount.count === 0;
}

export function bootDb() {
  initDb();
  seedCompanyProfiles();
}
