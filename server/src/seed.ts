import { db } from './db.js';
import { hashPassword } from './auth.js';
import { id } from './utils.js';

async function seed() {
  db.exec('DELETE FROM watchlists; DELETE FROM holdings; DELETE FROM transactions; DELETE FROM stock_price_history; DELETE FROM notifications; DELETE FROM quizzes; DELETE FROM quiz_attempts; DELETE FROM snapshots; DELETE FROM market_events; DELETE FROM admin_logs; DELETE FROM backups; DELETE FROM companies; DELETE FROM teams;');
  db.exec('DROP TABLE IF EXISTS admin_users;');
  db.exec('CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');

  db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), 'KevanDaGoat67', await hashPassword("KevanDaGoat67"));
  db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), "WeWantBigWee'sWeeWee", await hashPassword("WeWantBigWee'sWeeWee"));
  for (let i = 1; i <= 7; i++) {
    db.prepare('INSERT INTO teams (id, name, username, password_hash, cash) VALUES (?, ?, ?, ?, 5000)').run(id(), `Team ${i}`, `team${i}`, await hashPassword(`team${i}123`));
  }
  const companies = [
    ['Aurora Chips', 'AUR', 'Technology', 'Fast chip designer', 'Tech', 180],
    ['Blue Harbor Bank', 'BHB', 'Finance', 'Regional bank', 'Finance', 120],
    ['Cobalt Motors', 'CBM', 'Automotive', 'Electric vehicles', 'Industrials', 150],
    ['Delta Foods', 'DLT', 'Consumer', 'Food supplier', 'Consumer', 95],
    ['Evergreen Energy', 'EVG', 'Energy', 'Solar and wind utility', 'Energy', 140],
    ['Frost Labs', 'FRS', 'Biotech', 'Research lab', 'Healthcare', 160],
    ['Golden Freight', 'GFD', 'Logistics', 'Shipping network', 'Industrials', 110],
    ['Horizon Media', 'HRZ', 'Entertainment', 'Media studio', 'Communication', 105],
    ['Ion Retail', 'ION', 'Retail', 'Mall operator', 'Consumer', 90],
    ['Jade Minerals', 'JDM', 'Mining', 'Resource extraction', 'Materials', 130]
  ];
  for (const [name, ticker, industry, description, sector, price] of companies) {
    db.prepare('INSERT INTO companies (id, name, ticker, industry, description, sector, price) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id(), name, ticker, industry, description, sector, price);
  }
  db.prepare('INSERT INTO market_settings (id, status, event_mode) VALUES (1, "CLOSED", 1) ON CONFLICT(id) DO UPDATE SET status = excluded.status').run();
  db.prepare('INSERT INTO quizzes (id, question, options_json, answer_index, reward, active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(id(), 'What does IPO stand for?', JSON.stringify(['Initial Price Offer', 'Initial Public Offering', 'Investors Pick Options']), 1, 200);

  console.log('Seed complete');
}

seed();
