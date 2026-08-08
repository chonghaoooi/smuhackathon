import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
export function initDb() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      cash INTEGER NOT NULL DEFAULT 5000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL UNIQUE,
      industry TEXT NOT NULL,
      description TEXT NOT NULL,
      revenue INTEGER NOT NULL DEFAULT 0,
      profit INTEGER NOT NULL DEFAULT 0,
      debt INTEGER NOT NULL DEFAULT 0,
      dividend_yield REAL NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 100,
      volume INTEGER NOT NULL DEFAULT 0,
      sector TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS company_profiles (
      company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
      hq TEXT NOT NULL DEFAULT '',
      founded TEXT NOT NULL DEFAULT '',
      ceo TEXT NOT NULL DEFAULT '',
      focus TEXT NOT NULL DEFAULT '',
      scenario TEXT NOT NULL DEFAULT '',
      news TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      avg_price INTEGER NOT NULL DEFAULT 0,
      UNIQUE(team_id, company_id)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS stock_price_history (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      impact_type TEXT NOT NULL DEFAULT 'general',
      pinned INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS article_company_relations (
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      PRIMARY KEY(article_id, company_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      pinned INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      answer_index INTEGER NOT NULL,
      reward INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      selected_index INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS market_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      status TEXT NOT NULL DEFAULT 'CLOSED',
      event_mode INTEGER NOT NULL DEFAULT 1,
      inflation REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO market_settings (id) VALUES (1);
    CREATE TABLE IF NOT EXISTS market_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_value TEXT NOT NULL,
      effect_pct REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS watchlists (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      PRIMARY KEY(team_id, company_id)
    );
    CREATE TABLE IF NOT EXISTS team_networth_history (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      networth INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS session_presence (
      session_key TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_team_time ON transactions(team_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_history_company_time ON stock_price_history(company_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_team_read ON notifications(team_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_session_presence_last_seen ON session_presence(last_seen DESC);
  `);
    const teamColumns = db.prepare('PRAGMA table_info(teams)').all();
    if (!teamColumns.some((column) => column.name === 'hidden')) {
        db.prepare('ALTER TABLE teams ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0').run();
    }
    const profileColumns = db.prepare('PRAGMA table_info(company_profiles)').all();
    if (!profileColumns.length) {
        db.prepare(`
      CREATE TABLE IF NOT EXISTS company_profiles (
        company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
        hq TEXT NOT NULL DEFAULT '',
        founded TEXT NOT NULL DEFAULT '',
        ceo TEXT NOT NULL DEFAULT '',
        focus TEXT NOT NULL DEFAULT '',
        scenario TEXT NOT NULL DEFAULT '',
        news TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    }
    const presenceColumns = db.prepare('PRAGMA table_info(session_presence)').all();
    if (!presenceColumns.length) {
        db.prepare(`
      CREATE TABLE IF NOT EXISTS session_presence (
        session_key TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_session_presence_last_seen ON session_presence(last_seen DESC)').run();
    }
}
