import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { db } from './db.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.js';
import { id, clampPrice } from './utils.js';
import { config } from './config.js';
const DEFAULT_TEAMS = Array.from({ length: 7 }, (_, index) => ({
    name: `Team ${index + 1}`,
    username: `team${index + 1}`,
    password: `team${index + 1}123`
}));
const DEFAULT_COMPANIES = [
    { name: 'Aurora Chips', ticker: 'AUR', industry: 'Technology', description: 'Fast-chip design firm building neural processing units for localized large language model workloads. Focused on cutting data latency and winning cloud supply contracts.', sector: 'Tech', price: 180, revenue: 7000, profit: 1500, debt: 900, dividend_yield: 1.2 },
    { name: 'Blue Harbor Bank', ticker: 'BHB', industry: 'Finance', description: 'Regional bank serving local households and businesses through small-business lending and commercial real-estate financing. Revenue leans on net interest margin growth and liquidity management.', sector: 'Finance', price: 120, revenue: 6000, profit: 1000, debt: 500, dividend_yield: 2.4 },
    { name: 'Cobalt Motors', ticker: 'CBM', industry: 'Automotive', description: 'Industrial EV manufacturer producing delivery vans, heavy-duty transport chassis, and long-haul fleet trucks. Built around high-throughput assembly and fleet logistics contracts.', sector: 'Industrials', price: 150, revenue: 8000, profit: 1200, debt: 1400, dividend_yield: 0.8 },
    { name: 'Delta Foods', ticker: 'DLT', industry: 'Consumer', description: 'Institutional food supplier focused on nationwide distribution and consumer staples. Expanding into plant-based and high-protein product lines for modern grocery shelves.', sector: 'Consumer', price: 95, revenue: 4000, profit: 700, debt: 300, dividend_yield: 2.1 },
    { name: 'Evergreen Energy', ticker: 'EVG', industry: 'Energy', description: 'Solar and wind utility platform delivering clean power with a utility-style balance sheet. Revenue comes from contracted generation, grid services, and long-duration energy deals.', sector: 'Energy', price: 140, revenue: 5200, profit: 900, debt: 800, dividend_yield: 1.9 },
    { name: 'Frost Labs', ticker: 'FRS', industry: 'Biotech', description: 'Research lab developing advanced biotech platforms and specialty therapies. Mixes high R&D spending with volatile upside from clinical and IP-driven milestones.', sector: 'Healthcare', price: 160, revenue: 7500, profit: 1300, debt: 1100, dividend_yield: 0.5 },
    { name: 'Golden Freight', ticker: 'GFD', industry: 'Logistics', description: 'Global shipping and freight network with AI-driven routing hubs. Manages physical freight movement, supply-chain automation, and distributed transit infrastructure.', sector: 'Industrials', price: 110, revenue: 3600, profit: 600, debt: 450, dividend_yield: 2.0 },
    { name: 'Horizon Media', ticker: 'HRZ', industry: 'Entertainment', description: 'Entertainment studio producing streaming-first franchises and multi-platform IP. Strategy centers on owned content, licensed adaptation, and margin expansion from recurring fan bases.', sector: 'Communication', price: 105, revenue: 2800, profit: 500, debt: 150, dividend_yield: 1.0 },
    { name: 'Ion Retail', ticker: 'ION', industry: 'Retail', description: 'Commercial real-estate and mall operator converting retail space into mixed-use destinations. Builds traffic with dining, fitness, and entertainment tenants instead of traditional stores alone.', sector: 'Consumer', price: 90, revenue: 3900, profit: 650, debt: 250, dividend_yield: 2.3 },
    { name: 'Jade Minerals', ticker: 'JDM', industry: 'Mining', description: 'Resource extraction company mining rare-earth materials for batteries and electronics. Operates deep-crust excavation sites and supplies high-demand industrial inputs.', sector: 'Materials', price: 130, revenue: 4700, profit: 800, debt: 700, dividend_yield: 1.4 }
];
const DEFAULT_COMPANY_PROFILES = {
    AUR: {
        hq: 'Austin, Texas',
        founded: '2018',
        ceo: 'Maya Chen',
        focus: 'Designs neural processing chips for local AI inference and low-latency cloud workloads.',
        scenario: 'A major foundry delay or chip export restriction could squeeze margins and push the stock lower.',
        news: 'Aurora is expanding its supply agreement pipeline with smaller cloud providers.'
    },
    BHB: {
        hq: 'Charlotte, North Carolina',
        founded: '1994',
        ceo: 'Daniel Ross',
        focus: 'Provides regional banking, lending, and treasury services to households and small businesses.',
        scenario: 'Higher defaults or tighter regulation could hurt lending income and investor confidence.',
        news: 'Blue Harbor is tightening risk controls while keeping commercial lending active.'
    },
    CBM: {
        hq: 'Detroit, Michigan',
        founded: '2009',
        ceo: 'Priya Nair',
        focus: 'Builds EV delivery vans and fleet transport platforms for logistics partners.',
        scenario: 'A slowdown in fleet orders or battery supply constraints could pressure revenue growth.',
        news: 'Cobalt is seeking a larger logistics contract to support plant utilization.'
    },
    DLT: {
        hq: 'Chicago, Illinois',
        founded: '1988',
        ceo: 'Marcus Bell',
        focus: 'Supplies grocery staples and institutional food products with a growing plant-based line.',
        scenario: 'Commodity inflation or distribution bottlenecks can quickly compress food margins.',
        news: 'Delta Foods is rolling out a new high-protein product line across its core regions.'
    },
    EVG: {
        hq: 'Denver, Colorado',
        founded: '2012',
        ceo: 'Elena Moore',
        focus: 'Operates renewable power assets and grid service contracts across solar and wind markets.',
        scenario: 'Policy changes or lower-than-expected capacity factors could reduce contract value.',
        news: 'Evergreen Energy is adding new grid services capacity after recent demand growth.'
    },
    FRS: {
        hq: 'Boston, Massachusetts',
        founded: '2015',
        ceo: 'Dr. Lena Patel',
        focus: 'Develops biotech platforms and specialty therapies with a heavy research pipeline.',
        scenario: 'Clinical setbacks or patent disputes can cause sharp swings in valuation.',
        news: 'Frost Labs is preparing a milestone update for its lead therapy program.'
    },
    GFD: {
        hq: 'Memphis, Tennessee',
        founded: '2004',
        ceo: 'Owen Grant',
        focus: 'Runs freight, warehousing, and routing systems for global logistics customers.',
        scenario: 'Fuel spikes or shipping slowdowns can cut into freight network profitability.',
        news: 'Golden Freight is investing in routing automation to improve delivery efficiency.'
    },
    HRZ: {
        hq: 'Los Angeles, California',
        founded: '1999',
        ceo: 'Sofia Alvarez',
        focus: 'Produces streaming-first media franchises and sells multi-platform content rights.',
        scenario: 'A weak release slate could reduce recurring revenue and pressure ad-supported growth.',
        news: 'Horizon Media is lining up a new franchise launch for the next content cycle.'
    },
    ION: {
        hq: 'Dallas, Texas',
        founded: '2006',
        ceo: 'Jordan Blake',
        focus: 'Owns and operates retail real-estate and mixed-use destinations.',
        scenario: 'Retail vacancies or declining foot traffic could lower occupancy income.',
        news: 'Ion Retail is converting several properties into higher-traffic mixed-use centers.'
    },
    JDM: {
        hq: 'Phoenix, Arizona',
        founded: '2011',
        ceo: 'Riley Stone',
        focus: 'Extracts rare-earth and industrial minerals for battery and electronics manufacturers.',
        scenario: 'Commodity price drops or a mine shutdown could hit earnings quickly.',
        news: 'Jade Minerals is reporting stronger production from its newest extraction site.'
    }
};
const DEFAULT_ADMINS = [
    { username: 'KevanDaGoat67', password: 'KevanDaGoat67' },
    { username: "WeWantBigWee'sWeeWee", password: "WeWantBigWee'sWeeWee" }
];
function authFromReq(req) {
    const token = String(req.headers.authorization ?? '').replace('Bearer ', '');
    if (!token)
        return null;
    try {
        return verifyToken(token);
    }
    catch {
        return null;
    }
}
function requireRole(role) {
    return (req, res, next) => {
        const auth = authFromReq(req);
        if (!auth || auth.role !== role)
            return res.status(401).json({ error: 'Unauthorized' });
        req.auth = auth;
        next();
    };
}
function teamNetWorth(teamId) {
    const team = db.prepare('SELECT id, name, cash FROM teams WHERE id = ?').get(teamId);
    if (!team)
        return null;
    const portfolio = db.prepare(`
    SELECT COALESCE(SUM(holdings.quantity * companies.price), 0) AS value
    FROM holdings JOIN companies ON companies.id = holdings.company_id
    WHERE holdings.team_id = ?
  `).get(teamId);
    return { ...team, portfolio_value: portfolio.value, net_worth: team.cash + portfolio.value };
}
function leaderboardRows() {
    return db.prepare(`
    SELECT teams.id, teams.name, teams.cash,
      COALESCE(SUM(holdings.quantity * companies.price), 0) AS portfolio_value,
      teams.cash + COALESCE(SUM(holdings.quantity * companies.price), 0) AS net_worth
    FROM teams
    LEFT JOIN holdings ON holdings.team_id = teams.id
    LEFT JOIN companies ON companies.id = holdings.company_id
    WHERE teams.hidden = 0
    GROUP BY teams.id
    ORDER BY net_worth DESC, teams.name ASC
  `).all();
}
function writeAdminLog(action, details) {
    db.prepare('INSERT INTO admin_logs (id, action, details) VALUES (?, ?, ?)').run(id(), action, JSON.stringify(details));
}
function presenceKey(userId, role) {
    return `${role}:${userId}`;
}
function upsertPresence(userId, role, sessionKey = presenceKey(userId, role)) {
    db.prepare(`
    INSERT INTO session_presence (session_key, user_id, role, last_seen)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_key) DO UPDATE SET
      user_id = excluded.user_id,
      role = excluded.role,
      last_seen = CURRENT_TIMESTAMP
  `).run(sessionKey, userId, role);
}
function activePresenceWindowMinutes() {
    return 2;
}
function marketSnapshotPayload() {
    return {
        teams: db.prepare('SELECT * FROM teams').all(),
        companies: db.prepare('SELECT * FROM companies').all(),
        holdings: db.prepare('SELECT * FROM holdings').all(),
        transactions: db.prepare('SELECT * FROM transactions').all(),
        articles: db.prepare('SELECT * FROM articles').all(),
        notifications: db.prepare('SELECT * FROM notifications').all(),
        quizzes: db.prepare('SELECT * FROM quizzes').all(),
        market_settings: db.prepare('SELECT * FROM market_settings WHERE id = 1').get()
    };
}
function createSnapshot(label) {
    const payload = marketSnapshotPayload();
    const snapshotId = id();
    db.prepare('INSERT INTO snapshots (id, label, payload_json) VALUES (?, ?, ?)').run(snapshotId, label, JSON.stringify(payload));
    writeAdminLog('snapshot_created', { label, snapshotId });
    return snapshotId;
}
function backupPaths() {
    const backupDir = path.resolve(config.backupDir);
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return {
        backupDir,
        dbPath: path.resolve(config.databasePath),
        dbBackup: path.join(backupDir, `database_backup_${timestamp}.db`),
        snapshotFile: path.join(backupDir, `snapshot_${timestamp}.json`),
        timestamp
    };
}
async function makeBackup() {
    const paths = backupPaths();
    await db.backup(paths.dbBackup);
    fs.writeFileSync(paths.snapshotFile, JSON.stringify(marketSnapshotPayload(), null, 2));
    db.prepare('INSERT INTO backups (id, file_name, kind) VALUES (?, ?, ?)').run(id(), path.basename(paths.dbBackup), 'database');
    db.prepare('INSERT INTO backups (id, file_name, kind) VALUES (?, ?, ?)').run(id(), path.basename(paths.snapshotFile), 'snapshot');
    writeAdminLog('backup_created', { dbBackup: paths.dbBackup, snapshotFile: paths.snapshotFile });
    return paths;
}
function restoreSnapshotPayload(payload) {
    db.transaction(() => {
        for (const table of ['teams', 'companies', 'holdings', 'transactions', 'articles', 'article_company_relations', 'notifications', 'quizzes', 'quiz_attempts', 'market_settings', 'market_events', 'watchlists', 'team_networth_history', 'admin_logs']) {
            if (table === 'market_settings')
                continue;
            db.prepare(`DELETE FROM ${table}`).run();
        }
        for (const row of payload.teams ?? [])
            db.prepare('INSERT INTO teams (id, name, username, password_hash, cash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(row.id, row.name, row.username, row.password_hash, row.cash, row.created_at);
        for (const row of payload.companies ?? [])
            db.prepare('INSERT INTO companies (id, name, ticker, industry, description, revenue, profit, debt, dividend_yield, price, volume, sector, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(row.id, row.name, row.ticker, row.industry, row.description, row.revenue, row.profit, row.debt, row.dividend_yield, row.price, row.volume, row.sector, row.created_at);
        for (const row of payload.holdings ?? [])
            db.prepare('INSERT INTO holdings (id, team_id, company_id, quantity, avg_price) VALUES (?, ?, ?, ?, ?)').run(row.id, row.team_id, row.company_id, row.quantity, row.avg_price);
        for (const row of payload.transactions ?? [])
            db.prepare('INSERT INTO transactions (id, team_id, company_id, action, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(row.id, row.team_id, row.company_id, row.action, row.quantity, row.price, row.created_at);
        for (const row of payload.articles ?? [])
            db.prepare('INSERT INTO articles (id, title, body, category, impact_type, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(row.id, row.title, row.body, row.category, row.impact_type, row.published, row.created_at);
        for (const row of payload.notifications ?? [])
            db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority, pinned, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(row.id, row.team_id, row.title, row.body, row.type, row.priority, row.pinned, row.read_at, row.created_at);
        for (const row of payload.quizzes ?? [])
            db.prepare('INSERT INTO quizzes (id, question, options_json, answer_index, reward, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(row.id, row.question, row.options_json, row.answer_index, row.reward, row.active, row.created_at);
        const market = payload.market_settings;
        if (market)
            db.prepare('UPDATE market_settings SET status = ?, event_mode = ?, inflation = ?, interest_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(market.status, market.event_mode, market.inflation, market.interest_rate);
    })();
}
function maybeAutoSnapshot(action) {
    const settings = db.prepare('SELECT event_mode FROM market_settings WHERE id = 1').get();
    if (!settings?.event_mode)
        return;
    try {
        createSnapshot(`Before ${action}`);
    }
    catch (error) {
        console.warn(`Auto snapshot failed before ${action}:`, error);
    }
}
function notifyWatchlistedTeams(companyIds, title, body, type = 'news') {
    const uniqueTeamIds = new Set();
    for (const companyId of companyIds) {
        const teams = db.prepare('SELECT team_id FROM watchlists WHERE company_id = ?').all(companyId);
        for (const row of teams)
            uniqueTeamIds.add(row.team_id);
    }
    for (const teamId of uniqueTeamIds) {
        db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)').run(id(), teamId, title, body, type, 1);
    }
    return uniqueTeamIds.size;
}
function companyNamesFromIds(companyIds) {
    if (!companyIds.length)
        return [];
    const placeholders = companyIds.map(() => '?').join(', ');
    const rows = db.prepare(`SELECT id, name, ticker FROM companies WHERE id IN (${placeholders})`).all(...companyIds);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return companyIds.map((companyId) => byId.get(companyId)).filter(Boolean);
}
function formatCompanyMentions(companyIds) {
    const companies = companyNamesFromIds(companyIds);
    if (!companies.length)
        return '';
    const labels = companies.map((company) => `${company.name} (${company.ticker})`);
    if (labels.length === 1)
        return labels[0];
    return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}
function enrichArticleRow(article) {
    const companies = db.prepare(`
    SELECT companies.id, companies.name, companies.ticker
    FROM article_company_relations
    JOIN companies ON companies.id = article_company_relations.company_id
    WHERE article_company_relations.article_id = ?
    ORDER BY companies.ticker
  `).all(article.id);
    const companyNames = companies.map((company) => `${company.name} (${company.ticker})`);
    const companySuffix = companyNames.length ? ` Affected company${companyNames.length > 1 ? 's' : ''}: ${companyNames.join(', ')}.` : '';
    const body = String(article.body ?? '');
    const nextBody = companySuffix && !body.includes('Affected company') ? `${body}${companySuffix}` : body;
    return { ...article, companyNames, body: nextBody };
}
function upsertCompanyProfile(companyId, profile) {
    db.prepare(`
    INSERT INTO company_profiles (company_id, hq, founded, ceo, focus, scenario, news, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
      hq = excluded.hq,
      founded = excluded.founded,
      ceo = excluded.ceo,
      focus = excluded.focus,
      scenario = excluded.scenario,
      news = excluded.news,
      updated_at = CURRENT_TIMESTAMP
  `).run(companyId, profile.hq ?? '', profile.founded ?? '', profile.ceo ?? '', profile.focus ?? '', profile.scenario ?? '', profile.news ?? '');
}
export function seedCompanyProfiles() {
    const companies = db.prepare('SELECT id, ticker FROM companies').all();
    for (const company of companies) {
        const profile = DEFAULT_COMPANY_PROFILES[company.ticker];
        if (profile)
            upsertCompanyProfile(company.id, profile);
    }
}
export function createApi(io) {
    seedCompanyProfiles();
    const router = Router();
    router.get('/health', (_req, res) => {
        const market = db.prepare('SELECT * FROM market_settings WHERE id = 1').get();
        res.json({ ok: true, firstRun: isFirstRun(), market });
    });
    router.get('/bootstrap', (_req, res) => {
        res.json({
            teams: db.prepare('SELECT id, name, cash FROM teams WHERE hidden = 0 ORDER BY name').all(),
            companies: db.prepare('SELECT id, name, ticker, industry, price, volume, sector FROM companies ORDER BY ticker').all(),
            market: db.prepare('SELECT * FROM market_settings WHERE id = 1').get()
        });
    });
    router.post('/auth/login', async (req, res) => {
        const { username, password } = req.body;
        const admin = db.prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?').get(username);
        if (admin && await verifyPassword(password, admin.password_hash)) {
            return res.json({ token: signToken({ sub: admin.id, role: 'admin' }), role: 'admin' });
        }
        const team = db.prepare('SELECT id, username, password_hash FROM teams WHERE username = ?').get(username);
        if (team && await verifyPassword(password, team.password_hash)) {
            return res.json({ token: signToken({ sub: team.id, role: 'team' }), role: 'team' });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
    });
    router.post('/auth/bootstrap-admin', async (req, res) => {
        const { username, password } = req.body;
        const exists = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get();
        if (exists.count > 0)
            return res.status(400).json({ error: 'Admin already exists' });
        db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), username, await hashPassword(password));
        writeAdminLog('admin_bootstrapped', { username });
        res.json({ ok: true });
    });
    router.post('/auth/session', (req, res) => {
        const auth = authFromReq(req);
        if (!auth)
            return res.status(401).json({ error: 'Unauthorized' });
        upsertPresence(auth.sub, auth.role);
        res.json({ auth });
    });
    router.post('/presence/ping', (req, res) => {
        const auth = authFromReq(req);
        if (!auth)
            return res.status(401).json({ error: 'Unauthorized' });
        upsertPresence(auth.sub, auth.role);
        res.json({ ok: true });
    });
    router.get('/team/:id/dashboard', requireRole('team'), (req, res) => {
        const team = teamNetWorth(req.params.id);
        if (!team)
            return res.status(404).json({ error: 'Team not found' });
        const holdings = db.prepare(`
      SELECT holdings.quantity, holdings.avg_price, companies.name, companies.ticker, companies.price, companies.sector
      FROM holdings JOIN companies ON companies.id = holdings.company_id
      WHERE holdings.team_id = ?
      ORDER BY companies.ticker
    `).all(req.params.id);
        const notifications = db.prepare('SELECT * FROM notifications WHERE team_id = ? OR team_id IS NULL ORDER BY pinned DESC, created_at DESC LIMIT 10').all(req.params.id);
        const news = db.prepare('SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT 6').all().map(enrichArticleRow);
        const history = db.prepare('SELECT created_at, networth FROM team_networth_history WHERE team_id = ? ORDER BY created_at DESC LIMIT 48').all(req.params.id);
        const transactions = db.prepare(`
      SELECT transactions.*, companies.name AS company_name, companies.ticker
      FROM transactions JOIN companies ON companies.id = transactions.company_id
      WHERE transactions.team_id = ?
      ORDER BY transactions.created_at DESC
      LIMIT 48
    `).all(req.params.id);
        res.json({
            team,
            holdings,
            notifications,
            news,
            transactions,
            history,
            market: db.prepare('SELECT * FROM market_settings WHERE id = 1').get()
        });
    });
    router.get('/market', (_req, res) => {
        const companies = db.prepare('SELECT * FROM companies ORDER BY ticker').all();
        res.json({ companies });
    });
    router.get('/company/:id', (req, res) => {
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
        if (!company)
            return res.status(404).json({ error: 'Company not found' });
        const profile = db.prepare('SELECT * FROM company_profiles WHERE company_id = ?').get(req.params.id);
        const history = db.prepare('SELECT created_at, price FROM stock_price_history WHERE company_id = ? ORDER BY created_at ASC').all(req.params.id);
        const articles = db.prepare(`
      SELECT articles.* FROM articles
      JOIN article_company_relations ON article_company_relations.article_id = articles.id
      WHERE article_company_relations.company_id = ? AND articles.published = 1
      ORDER BY articles.created_at DESC
    `).all(req.params.id);
        res.json({ company, profile, history, articles });
    });
    router.get('/portfolio/:teamId', (req, res) => {
        const team = teamNetWorth(req.params.teamId);
        if (!team)
            return res.status(404).json({ error: 'Team not found' });
        const holdings = db.prepare(`
      SELECT holdings.quantity, holdings.avg_price, companies.name, companies.ticker, companies.price,
        holdings.quantity * companies.price AS current_value,
        (companies.price - holdings.avg_price) * holdings.quantity AS unrealized_pl
      FROM holdings JOIN companies ON companies.id = holdings.company_id
      WHERE holdings.team_id = ?
      ORDER BY companies.ticker
    `).all(req.params.teamId);
        res.json({ team, holdings });
    });
    router.get('/transactions/:teamId', (req, res) => {
        const transactions = db.prepare(`
      SELECT transactions.*, companies.name AS company_name, companies.ticker
      FROM transactions JOIN companies ON companies.id = transactions.company_id
      WHERE transactions.team_id = ?
      ORDER BY transactions.created_at DESC
    `).all(req.params.teamId);
        res.json({ transactions });
    });
    router.get('/leaderboard', (_req, res) => {
        res.json({ teams: leaderboardRows() });
    });
    router.get('/news', (_req, res) => {
        const articles = db.prepare('SELECT * FROM articles ORDER BY pinned DESC, created_at DESC').all().map(enrichArticleRow);
        res.json({ articles });
    });
    router.get('/notifications/:teamId', (req, res) => {
        const notifications = db.prepare('SELECT * FROM notifications WHERE team_id = ? OR team_id IS NULL ORDER BY pinned DESC, created_at DESC').all(req.params.teamId);
        res.json({ notifications });
    });
    router.get('/watchlist/:teamId', (req, res) => {
        const watchlist = db.prepare(`
      SELECT companies.* FROM watchlists
      JOIN companies ON companies.id = watchlists.company_id
      WHERE watchlists.team_id = ?
      ORDER BY companies.ticker
    `).all(req.params.teamId);
        res.json({ watchlist });
    });
    router.delete('/watchlist/:teamId/:companyId', requireRole('team'), (req, res) => {
        const auth = authFromReq(req);
        if (auth?.sub !== req.params.teamId)
            return res.status(403).json({ error: 'Forbidden' });
        db.prepare('DELETE FROM watchlists WHERE team_id = ? AND company_id = ?').run(req.params.teamId, req.params.companyId);
        res.json({ ok: true });
    });
    router.post('/trade/buy', requireRole('team'), (req, res) => {
        const { teamId, companyId, quantity } = req.body;
        const auth = authFromReq(req);
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
        const market = db.prepare('SELECT * FROM market_settings WHERE id = 1').get();
        if (!company || !team || !quantity || quantity <= 0)
            return res.status(400).json({ error: 'Invalid trade' });
        if (auth?.sub !== teamId)
            return res.status(403).json({ error: 'Forbidden' });
        if (market.status === 'CLOSED' || market.status === 'PAUSED' || market.status === 'FROZEN')
            return res.status(400).json({ error: 'Trading disabled' });
        const maxAffordable = Math.floor(team.cash / company.price);
        const tradeQuantity = Math.min(quantity, maxAffordable);
        if (tradeQuantity <= 0)
            return res.status(400).json({ error: 'Insufficient cash' });
        const cost = company.price * tradeQuantity;
        db.transaction(() => {
            db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(cost, teamId);
            db.prepare(`
        INSERT INTO holdings (id, team_id, company_id, quantity, avg_price)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(team_id, company_id) DO UPDATE SET
          quantity = quantity + excluded.quantity,
          avg_price = excluded.avg_price
      `).run(id(), teamId, companyId, tradeQuantity, company.price);
            db.prepare('UPDATE companies SET volume = volume + ? WHERE id = ?').run(tradeQuantity, companyId);
            db.prepare("INSERT INTO transactions (id, team_id, company_id, action, quantity, price) VALUES (?, ?, ?, 'BUY', ?, ?)").run(id(), teamId, companyId, tradeQuantity, company.price);
            db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority) VALUES (?, ?, ?, ?, ?, 1)').run(id(), teamId, 'Buy completed', `${tradeQuantity} shares of ${company.ticker} at ${company.price}`, 'trade');
            db.prepare('INSERT INTO team_networth_history (id, team_id, networth) VALUES (?, ?, ?)').run(id(), teamId, teamNetWorth(teamId)?.net_worth ?? team.cash);
        })();
        io.emit('stock-prices-updated');
        io.emit('leaderboard-updated');
        res.json({ ok: true, quantity: tradeQuantity });
    });
    router.post('/trade/sell', requireRole('team'), (req, res) => {
        const { teamId, companyId, quantity } = req.body;
        const auth = authFromReq(req);
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
        const holding = db.prepare('SELECT * FROM holdings WHERE team_id = ? AND company_id = ?').get(teamId, companyId);
        const market = db.prepare('SELECT * FROM market_settings WHERE id = 1').get();
        if (!company || !team || !holding || !quantity || quantity <= 0)
            return res.status(400).json({ error: 'Invalid trade' });
        if (auth?.sub !== teamId)
            return res.status(403).json({ error: 'Forbidden' });
        if (market.status === 'CLOSED' || market.status === 'PAUSED' || market.status === 'FROZEN')
            return res.status(400).json({ error: 'Trading disabled' });
        const tradeQuantity = Math.min(quantity, holding.quantity);
        if (tradeQuantity <= 0)
            return res.status(400).json({ error: 'Insufficient shares' });
        const revenue = company.price * tradeQuantity;
        db.transaction(() => {
            db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(revenue, teamId);
            db.prepare('UPDATE holdings SET quantity = quantity - ? WHERE team_id = ? AND company_id = ?').run(tradeQuantity, teamId, companyId);
            db.prepare('DELETE FROM holdings WHERE team_id = ? AND company_id = ? AND quantity <= 0').run(teamId, companyId);
            db.prepare("INSERT INTO transactions (id, team_id, company_id, action, quantity, price) VALUES (?, ?, ?, 'SELL', ?, ?)").run(id(), teamId, companyId, tradeQuantity, company.price);
            db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority) VALUES (?, ?, ?, ?, ?, 1)').run(id(), teamId, 'Sell completed', `${tradeQuantity} shares of ${company.ticker} at ${company.price}`, 'trade');
            db.prepare('INSERT INTO team_networth_history (id, team_id, networth) VALUES (?, ?, ?)').run(id(), teamId, teamNetWorth(teamId)?.net_worth ?? team.cash);
        })();
        io.emit('stock-prices-updated');
        io.emit('leaderboard-updated');
        res.json({ ok: true, quantity: tradeQuantity });
    });
    router.post('/watchlist', requireRole('team'), (req, res) => {
        const { teamId, companyId } = req.body;
        const auth = authFromReq(req);
        if (auth?.sub !== teamId)
            return res.status(403).json({ error: 'Forbidden' });
        const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId);
        const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
        if (!team || !company)
            return res.status(400).json({ error: 'Invalid watchlist entry' });
        db.prepare('INSERT OR IGNORE INTO watchlists (team_id, company_id) VALUES (?, ?)').run(teamId, companyId);
        res.json({ ok: true });
    });
    router.delete('/watchlist', requireRole('team'), (req, res) => {
        const { teamId, companyId } = req.body;
        const auth = authFromReq(req);
        if (auth?.sub !== teamId)
            return res.status(403).json({ error: 'Forbidden' });
        db.prepare('DELETE FROM watchlists WHERE team_id = ? AND company_id = ?').run(teamId, companyId);
        res.json({ ok: true });
    });
    router.post('/quiz/answer', (req, res) => {
        const { quizId, teamId, selectedIndex } = req.body;
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
        if (!quiz || !quiz.active)
            return res.status(400).json({ error: 'Quiz inactive' });
        const correct = quiz.answer_index === selectedIndex ? 1 : 0;
        db.transaction(() => {
            db.prepare('INSERT INTO quiz_attempts (id, quiz_id, team_id, selected_index, correct) VALUES (?, ?, ?, ?, ?)').run(id(), quizId, teamId, selectedIndex, correct);
            if (correct) {
                db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(quiz.reward, teamId);
                db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority) VALUES (?, ?, ?, ?, ?, 2)').run(id(), teamId, 'Quiz reward', `Correct answer earned ${quiz.reward} Cashbux`, 'system');
            }
        })();
        res.json({ correct: Boolean(correct) });
    });
    router.get('/admin/overview', requireRole('admin'), (_req, res) => {
        const market = db.prepare('SELECT * FROM market_settings WHERE id = 1').get();
        const connectedUsersRow = db.prepare(`
      SELECT COUNT(*) AS count FROM session_presence
      WHERE last_seen >= datetime('now', ?)
    `).get(`-${activePresenceWindowMinutes()} minutes`);
        const teams = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE hidden = 0').get();
        const hiddenTeams = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE hidden = 1').get();
        const companies = db.prepare('SELECT COUNT(*) AS count FROM companies').get();
        const dbHealth = !!db.prepare('SELECT 1').get();
        const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC LIMIT 10').all();
        const logs = db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 25').all();
        res.json({
            teams,
            hiddenTeams,
            totalTeams: db.prepare('SELECT COUNT(*) AS count FROM teams').get(),
            companies,
            market,
            totalMoney: db.prepare('SELECT COALESCE(SUM(cash), 0) AS total FROM teams WHERE hidden = 0').get(),
            totalMarketValue: db.prepare('SELECT COALESCE(SUM(price), 0) AS total FROM companies').get(),
            leaderboard: leaderboardRows(),
            logs,
            backups,
            diagnostics: {
                serverIp: firstNonInternalIp(),
                connectedUsers: connectedUsersRow.count,
                connectedTeams: db.prepare('SELECT COUNT(*) AS count FROM teams WHERE hidden = 0').get(),
                socketConnections: io.engine.clientsCount,
                dbHealth,
                lastBackupTime: db.prepare('SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1').get()
            }
        });
    });
    router.post('/admin/setup', async (req, res) => {
        const { adminUsername, adminPassword, startingCash, teams, companies, eventMode } = req.body;
        db.prepare('DELETE FROM admin_users').run();
        db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), adminUsername, await hashPassword(adminPassword));
        for (const admin of DEFAULT_ADMINS) {
            if (admin.username !== adminUsername) {
                db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), admin.username, await hashPassword(admin.password));
            }
        }
        db.prepare('DELETE FROM teams').run();
        db.prepare('DELETE FROM companies').run();
        for (const team of teams) {
            db.prepare('INSERT INTO teams (id, name, username, password_hash, cash) VALUES (?, ?, ?, ?, ?)').run(id(), team.name, team.username, await hashPassword(team.password), startingCash);
        }
        for (const company of companies) {
            db.prepare(`
        INSERT INTO companies (id, name, ticker, industry, description, revenue, profit, debt, dividend_yield, price, sector)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id(), company.name, company.ticker.toUpperCase(), company.industry, company.description, company.revenue, company.profit, company.debt, company.dividend_yield, clampPrice(company.price), company.sector);
        }
        seedCompanyProfiles();
        db.prepare("UPDATE market_settings SET event_mode = ?, status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(eventMode ? 1 : 0);
        writeAdminLog('setup_completed', { adminUsername, teamCount: teams.length, companyCount: companies.length });
        res.json({ ok: true });
    });
    router.post('/admin/reset-event', requireRole('admin'), async (_req, res) => {
        maybeAutoSnapshot('full event reset');
        db.transaction(() => {
            db.prepare('DELETE FROM admin_users').run();
            for (const table of ['watchlists', 'holdings', 'transactions', 'stock_price_history', 'notifications', 'quizzes', 'quiz_attempts', 'market_events', 'article_company_relations', 'articles', 'companies', 'teams', 'team_networth_history']) {
                db.prepare(`DELETE FROM ${table}`).run();
            }
            db.prepare("UPDATE market_settings SET status = 'CLOSED', event_mode = 1, inflation = 0, interest_rate = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
        })();
        for (const admin of DEFAULT_ADMINS) {
            db.prepare('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)').run(id(), admin.username, await hashPassword(admin.password));
        }
        for (const team of DEFAULT_TEAMS) {
            db.prepare('INSERT INTO teams (id, name, username, password_hash, hidden, cash) VALUES (?, ?, ?, ?, 0, 5000)').run(id(), team.name, team.username, await hashPassword(team.password));
        }
        for (const company of DEFAULT_COMPANIES) {
            db.prepare(`
        INSERT INTO companies (id, name, ticker, industry, description, revenue, profit, debt, dividend_yield, price, sector)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id(), company.name, company.ticker.toUpperCase(), company.industry, company.description, company.revenue, company.profit, company.debt, company.dividend_yield, clampPrice(company.price), company.sector);
        }
        seedCompanyProfiles();
        db.prepare('INSERT INTO quizzes (id, question, options_json, answer_index, reward, active) VALUES (?, ?, ?, ?, ?, 1)')
            .run(id(), 'What does IPO stand for?', JSON.stringify(['Initial Price Offer', 'Initial Public Offering', 'Investors Pick Options']), 1, 200);
        writeAdminLog('event_reset', { teamCount: DEFAULT_TEAMS.length, companyCount: DEFAULT_COMPANIES.length });
        res.json({ ok: true });
    });
    router.post('/admin/market/status', requireRole('admin'), (req, res) => {
        const { status } = req.body;
        maybeAutoSnapshot(`market ${status.toLowerCase()}`);
        db.prepare('UPDATE market_settings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(status);
        io.emit('market-status-updated', { status });
        writeAdminLog('market_status_changed', { status });
        res.json({ ok: true });
    });
    router.post('/admin/market/settings', requireRole('admin'), (req, res) => {
        const { inflation, interestRate, eventMode } = req.body;
        db.prepare('UPDATE market_settings SET inflation = ?, interest_rate = ?, event_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(inflation, interestRate, eventMode ? 1 : 0);
        if (inflation !== 0) {
            const companies = db.prepare('SELECT id, price FROM companies').all();
            for (const company of companies) {
                const next = clampPrice(company.price * (1 + inflation / 100));
                db.prepare('UPDATE companies SET price = ? WHERE id = ?').run(next, company.id);
                db.prepare('INSERT INTO stock_price_history (id, company_id, price) VALUES (?, ?, ?)').run(id(), company.id, next);
            }
            io.emit('stock-prices-updated');
        }
        writeAdminLog('market_settings_changed', { inflation, interestRate, eventMode });
        res.json({ ok: true });
    });
    router.post('/admin/team', requireRole('admin'), async (req, res) => {
        maybeAutoSnapshot('team mutation');
        const { id: teamId, name, username, password, cash, hidden } = req.body;
        if (teamId) {
            db.prepare('UPDATE teams SET name = ?, username = ?, cash = ?, hidden = ? WHERE id = ?').run(name, username, cash, hidden ? 1 : 0, teamId);
            if (password)
                db.prepare('UPDATE teams SET password_hash = ? WHERE id = ?').run(await hashPassword(password), teamId);
            writeAdminLog('team_updated', { teamId });
        }
        else {
            db.prepare('INSERT INTO teams (id, name, username, password_hash, hidden, cash) VALUES (?, ?, ?, ?, ?, ?)').run(id(), name, username, await hashPassword(password ?? 'changeme123'), hidden ? 1 : 0, cash);
            writeAdminLog('team_created', { name, hidden: Boolean(hidden) });
        }
        res.json({ ok: true });
    });
    router.post('/admin/team/:id/visibility', requireRole('admin'), (req, res) => {
        const { hidden } = req.body;
        db.prepare('UPDATE teams SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, req.params.id);
        writeAdminLog('team_visibility_changed', { teamId: req.params.id, hidden: Boolean(hidden) });
        res.json({ ok: true });
    });
    router.delete('/admin/team/:id', requireRole('admin'), (req, res) => {
        maybeAutoSnapshot('team deletion');
        db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
        writeAdminLog('team_deleted', { teamId: req.params.id });
        res.json({ ok: true });
    });
    router.post('/admin/company', requireRole('admin'), (req, res) => {
        maybeAutoSnapshot('company mutation');
        const body = req.body;
        if (body.id) {
            db.prepare(`
        UPDATE companies SET name = ?, ticker = ?, industry = ?, description = ?, revenue = ?, profit = ?, debt = ?,
          dividend_yield = ?, price = ?, sector = ?, volume = ?
        WHERE id = ?
      `).run(body.name, body.ticker.toUpperCase(), body.industry, body.description, body.revenue, body.profit, body.debt, body.dividend_yield, clampPrice(body.price), body.sector, body.volume ?? 0, body.id);
            upsertCompanyProfile(body.id, {
                hq: body.hq,
                founded: body.founded,
                ceo: body.ceo,
                focus: body.focus,
                scenario: body.scenario,
                news: body.news
            });
            writeAdminLog('company_updated', { companyId: body.id });
        }
        else {
            db.prepare(`
        INSERT INTO companies (id, name, ticker, industry, description, revenue, profit, debt, dividend_yield, price, sector)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id(), body.name, body.ticker.toUpperCase(), body.industry, body.description, body.revenue, body.profit, body.debt, body.dividend_yield, clampPrice(body.price), body.sector);
            const createdId = db.prepare('SELECT id FROM companies WHERE ticker = ?').get(body.ticker.toUpperCase());
            if (createdId?.id) {
                upsertCompanyProfile(createdId.id, {
                    hq: body.hq,
                    founded: body.founded,
                    ceo: body.ceo,
                    focus: body.focus,
                    scenario: body.scenario,
                    news: body.news
                });
            }
            writeAdminLog('company_created', { ticker: body.ticker });
        }
        res.json({ ok: true });
    });
    router.delete('/admin/company/:id', requireRole('admin'), (req, res) => {
        maybeAutoSnapshot('company deletion');
        db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
        writeAdminLog('company_deleted', { companyId: req.params.id });
        res.json({ ok: true });
    });
    router.post('/admin/news', requireRole('admin'), (req, res) => {
        const body = req.body;
        const articleId = body.id ?? id();
        if (body.id) {
            db.prepare('UPDATE articles SET title = ?, body = ?, category = ?, impact_type = ?, published = ? WHERE id = ?').run(body.title, body.body, body.category, body.impact_type, body.published ? 1 : 0, articleId);
            db.prepare('DELETE FROM article_company_relations WHERE article_id = ?').run(articleId);
        }
        else {
            db.prepare('INSERT INTO articles (id, title, body, category, impact_type, published) VALUES (?, ?, ?, ?, ?, ?)').run(articleId, body.title, body.body, body.category, body.impact_type, body.published ? 1 : 0);
        }
        for (const companyId of body.companyIds ?? []) {
            db.prepare('INSERT OR IGNORE INTO article_company_relations (article_id, company_id) VALUES (?, ?)').run(articleId, companyId);
        }
        const companyIds = body.companyIds ?? [];
        const companyMentions = formatCompanyMentions(companyIds);
        const articleBody = companyMentions && !body.body.includes(companyMentions) ? `${body.body} Affected company: ${companyMentions}.` : body.body;
        if (body.published) {
            db.prepare('UPDATE articles SET body = ? WHERE id = ?').run(articleBody, articleId);
        }
        const affectedTeams = body.published ? notifyWatchlistedTeams(companyIds, body.title, articleBody, 'news') : 0;
        io.emit('news-published', { articleId, companyIds, companyNames: companyMentions, affectedTeams });
        writeAdminLog('article_saved', { articleId });
        res.json({ ok: true, id: articleId });
    });
    router.delete('/admin/news/:id', requireRole('admin'), (req, res) => {
        db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
        writeAdminLog('article_deleted', { articleId: req.params.id });
        res.json({ ok: true });
    });
    router.post('/admin/quiz', requireRole('admin'), (req, res) => {
        const body = req.body;
        const quizId = body.id ?? id();
        if (body.id) {
            db.prepare('UPDATE quizzes SET question = ?, options_json = ?, answer_index = ?, reward = ?, active = ? WHERE id = ?').run(body.question, JSON.stringify(body.options), body.answerIndex, body.reward, body.active ? 1 : 0, quizId);
        }
        else {
            db.prepare('INSERT INTO quizzes (id, question, options_json, answer_index, reward, active) VALUES (?, ?, ?, ?, ?, ?)').run(quizId, body.question, JSON.stringify(body.options), body.answerIndex, body.reward, body.active ? 1 : 0);
        }
        io.emit('quiz-published', { quizId });
        writeAdminLog('quiz_saved', { quizId });
        res.json({ ok: true, id: quizId });
    });
    router.delete('/admin/quiz/:id', requireRole('admin'), (req, res) => {
        db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
        writeAdminLog('quiz_deleted', { quizId: req.params.id });
        res.json({ ok: true });
    });
    router.post('/admin/notifications', requireRole('admin'), (req, res) => {
        const body = req.body;
        db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id(), body.teamId ?? null, body.title, body.body, 'admin', body.priority, body.pinned ? 1 : 0);
        io.emit('notification-created', { title: body.title, body: body.body, teamId: body.teamId ?? null });
        writeAdminLog('notification_created', body);
        res.json({ ok: true });
    });
    router.post('/admin/trigger-event', requireRole('admin'), (req, res) => {
        maybeAutoSnapshot('market event');
        const { name, targetType, targetValue, effectPct } = req.body;
        db.prepare('INSERT INTO market_events (id, name, target_type, target_value, effect_pct) VALUES (?, ?, ?, ?, ?)').run(id(), name, targetType, targetValue, effectPct);
        const targetCompany = targetType === 'company' ? db.prepare('SELECT id, name, ticker FROM companies WHERE id = ?').get(targetValue) : undefined;
        const targetLabel = targetType === 'company'
            ? targetCompany ? `${targetCompany.name} (${targetCompany.ticker})` : targetValue
            : targetType === 'sector'
                ? `${targetValue} sector`
                : 'the overall market';
        const eventBody = `${name || 'A market event'} affected ${targetLabel} by ${effectPct}%`;
        db.prepare('INSERT INTO articles (id, title, body, category, impact_type, published) VALUES (?, ?, ?, ?, ?, 1)').run(id(), name || 'Market event', eventBody, 'Market News', targetType === 'market' ? 'market' : targetType);
        const affectedCompanyIds = targetType === 'company'
            ? [targetValue]
            : targetType === 'sector'
                ? db.prepare('SELECT id FROM companies WHERE sector = ?').all(targetValue).map((row) => row.id)
                : db.prepare('SELECT id FROM companies').all().map((row) => row.id);
        const affectedTeams = notifyWatchlistedTeams(affectedCompanyIds, name || 'Market event', eventBody, 'news');
        const companies = db.prepare('SELECT * FROM companies').all();
        for (const company of companies) {
            const shouldApply = targetType === 'market' ||
                (targetType === 'sector' && company.sector === targetValue) ||
                (targetType === 'company' && company.id === targetValue);
            if (shouldApply) {
                const next = clampPrice(company.price + (company.price * effectPct) / 100);
                db.prepare('UPDATE companies SET price = ? WHERE id = ?').run(next, company.id);
                db.prepare('INSERT INTO stock_price_history (id, company_id, price) VALUES (?, ?, ?)').run(id(), company.id, next);
            }
        }
        io.emit('stock-prices-updated');
        io.emit('news-published', { source: 'market-event', affectedTeams, targetType, targetValue, targetLabel });
        writeAdminLog('market_event_triggered', { name, targetType, targetValue, effectPct, affectedTeams });
        res.json({ ok: true });
    });
    router.post('/admin/snapshot', requireRole('admin'), (req, res) => {
        const { label } = req.body;
        const snapshotId = createSnapshot(label);
        res.json({ ok: true, snapshotId });
    });
    router.get('/admin/snapshots', requireRole('admin'), (_req, res) => {
        res.json({ snapshots: db.prepare('SELECT * FROM snapshots ORDER BY created_at DESC').all() });
    });
    router.post('/admin/snapshots/:id/restore', requireRole('admin'), (req, res) => {
        const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id);
        if (!snapshot)
            return res.status(404).json({ error: 'Snapshot not found' });
        restoreSnapshotPayload(JSON.parse(snapshot.payload_json));
        writeAdminLog('snapshot_restored', { snapshotId: snapshot.id });
        res.json({ ok: true });
    });
    router.post('/admin/backups/:fileName/restore', requireRole('admin'), (req, res) => {
        const safeName = path.basename(req.params.fileName);
        if (!safeName.endsWith('.json'))
            return res.status(400).json({ error: 'Only snapshot backups can be restored in-browser' });
        const backupRoot = path.resolve(config.backupDir);
        const filePath = path.resolve(backupRoot, safeName);
        if (!filePath.startsWith(backupRoot))
            return res.status(400).json({ error: 'Invalid backup file' });
        if (!fs.existsSync(filePath))
            return res.status(404).json({ error: 'Backup file not found' });
        restoreSnapshotPayload(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        writeAdminLog('backup_restored', { fileName: safeName });
        res.json({ ok: true });
    });
    router.delete('/admin/snapshots/:id', requireRole('admin'), (req, res) => {
        db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id);
        writeAdminLog('snapshot_deleted', { snapshotId: req.params.id });
        res.json({ ok: true });
    });
    router.get('/admin/events', requireRole('admin'), (_req, res) => {
        res.json({ events: db.prepare('SELECT * FROM market_events ORDER BY created_at DESC').all() });
    });
    router.get('/admin/logs', requireRole('admin'), (_req, res) => {
        res.json({ logs: db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC').all() });
    });
    router.get('/admin/network', requireRole('admin'), (_req, res) => {
        const dbHealth = !!db.prepare('SELECT 1').get();
        const connectedUsersRow = db.prepare(`
      SELECT COUNT(*) AS count FROM session_presence
      WHERE last_seen >= datetime('now', ?)
    `).get(`-${activePresenceWindowMinutes()} minutes`);
        const devices = db.prepare(`
      SELECT user_id, role, last_seen
      FROM session_presence
      WHERE last_seen >= datetime('now', ?)
      ORDER BY last_seen DESC
    `).all(`-${activePresenceWindowMinutes()} minutes`);
        res.json({
            serverIp: firstNonInternalIp(),
            connectedUsers: connectedUsersRow.count,
            connectedTeams: db.prepare('SELECT COUNT(*) AS count FROM teams WHERE hidden = 0').get(),
            hiddenTeams: db.prepare('SELECT COUNT(*) AS count FROM teams WHERE hidden = 1').get(),
            socketConnections: io.engine.clientsCount,
            dbHealth,
            lastBackupTime: db.prepare('SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1').get(),
            marketStatus: db.prepare('SELECT status FROM market_settings WHERE id = 1').get(),
            devices
        });
    });
    router.post('/admin/backup', requireRole('admin'), (_req, res) => {
        makeBackup()
            .then((result) => res.json({ ok: true, ...result }))
            .catch((error) => res.status(500).json({ error: error instanceof Error ? error.message : 'Backup failed' }));
    });
    router.get('/admin/backups', requireRole('admin'), (_req, res) => {
        res.json({ backups: db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all() });
    });
    router.get('/admin/backups/:fileName/download', requireRole('admin'), (req, res) => {
        const safeName = path.basename(req.params.fileName);
        const backupRoot = path.resolve(config.backupDir);
        const filePath = path.resolve(backupRoot, safeName);
        if (!filePath.startsWith(backupRoot))
            return res.status(400).json({ error: 'Invalid backup file' });
        if (!fs.existsSync(filePath))
            return res.status(404).json({ error: 'Backup file not found' });
        res.download(filePath, safeName);
    });
    router.get('/exports/leaderboard.csv', requireRole('admin'), (_req, res) => {
        res.type('text/csv').send(csvFromRows(leaderboardRows()));
    });
    router.get('/exports/transactions.csv', requireRole('admin'), (_req, res) => {
        const rows = db.prepare(`
      SELECT transactions.*, teams.name AS team_name, companies.ticker
      FROM transactions JOIN teams ON teams.id = transactions.team_id
      JOIN companies ON companies.id = transactions.company_id
      ORDER BY transactions.created_at DESC
    `).all();
        res.type('text/csv').send(csvFromRows(rows));
    });
    router.get('/exports/logs.csv', requireRole('admin'), (_req, res) => {
        res.type('text/csv').send(csvFromRows(db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC').all()));
    });
    router.get('/exports/portfolios.csv', requireRole('admin'), (_req, res) => {
        const rows = leaderboardRows().map((row) => ({ team_name: row.name, cash: row.cash, portfolio_value: row.portfolio_value, net_worth: row.net_worth }));
        res.type('text/csv').send(csvFromRows(rows));
    });
    router.post('/admin/team/:id/password', requireRole('admin'), async (req, res) => {
        const { password } = req.body;
        db.prepare('UPDATE teams SET password_hash = ? WHERE id = ?').run(await hashPassword(password), req.params.id);
        res.json({ ok: true });
    });
    router.post('/admin/team/:id/cash', requireRole('admin'), (req, res) => {
        const { cash } = req.body;
        db.prepare('UPDATE teams SET cash = ? WHERE id = ?').run(cash, req.params.id);
        res.json({ ok: true });
    });
    router.post('/admin/company/:id/price', requireRole('admin'), (req, res) => {
        const { price } = req.body;
        const next = clampPrice(price);
        db.prepare('UPDATE companies SET price = ? WHERE id = ?').run(next, req.params.id);
        db.prepare('INSERT INTO stock_price_history (id, company_id, price) VALUES (?, ?, ?)').run(id(), req.params.id, next);
        res.json({ ok: true });
    });
    router.post('/admin/team/:id/notification', requireRole('admin'), (req, res) => {
        const { title, body, priority, pinned } = req.body;
        db.prepare('INSERT INTO notifications (id, team_id, title, body, type, priority, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id(), req.params.id, title, body, 'admin', priority, pinned ? 1 : 0);
        res.json({ ok: true });
    });
    router.get('/admin/dump', requireRole('admin'), (_req, res) => {
        res.json(marketSnapshotPayload());
    });
    router.post('/admin/open-market', requireRole('admin'), (_req, res) => {
        maybeAutoSnapshot('market open');
        db.prepare("UPDATE market_settings SET status = 'OPEN', updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
        io.emit('market-status-updated', { status: 'OPEN' });
        res.json({ ok: true });
    });
    router.post('/admin/close-market', requireRole('admin'), (_req, res) => {
        maybeAutoSnapshot('market close');
        db.prepare("UPDATE market_settings SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
        io.emit('market-status-updated', { status: 'CLOSED' });
        res.json({ ok: true });
    });
    router.post('/admin/pause-market', requireRole('admin'), (_req, res) => {
        db.prepare("UPDATE market_settings SET status = 'PAUSED', updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
        io.emit('market-status-updated', { status: 'PAUSED' });
        res.json({ ok: true });
    });
    router.post('/admin/freeze-market', requireRole('admin'), (_req, res) => {
        db.prepare("UPDATE market_settings SET status = 'FROZEN', updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
        io.emit('market-status-updated', { status: 'FROZEN' });
        res.json({ ok: true });
    });
    router.post('/admin/company/:id/dividend', requireRole('admin'), (req, res) => {
        const { dividend_yield } = req.body;
        db.prepare('UPDATE companies SET dividend_yield = ? WHERE id = ?').run(dividend_yield, req.params.id);
        res.json({ ok: true });
    });
    router.get('/admin/teams', requireRole('admin'), (_req, res) => {
        res.json({ teams: db.prepare('SELECT id, name, username, cash, hidden, created_at FROM teams ORDER BY name').all() });
    });
    router.get('/admin/companies', requireRole('admin'), (_req, res) => {
        const companies = db.prepare(`
      SELECT companies.*, company_profiles.hq, company_profiles.founded, company_profiles.ceo, company_profiles.focus, company_profiles.scenario, company_profiles.news
      FROM companies
      LEFT JOIN company_profiles ON company_profiles.company_id = companies.id
      ORDER BY companies.ticker
    `).all();
        res.json({ companies });
    });
    router.get('/admin/quizzes', requireRole('admin'), (_req, res) => {
        const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all().map((quiz) => ({ ...quiz, options: JSON.parse(quiz.options_json) }));
        res.json({ quizzes });
    });
    router.get('/admin/news', requireRole('admin'), (_req, res) => {
        res.json({ articles: db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all().map(enrichArticleRow) });
    });
    router.get('/admin/notifications', requireRole('admin'), (_req, res) => {
        res.json({ notifications: db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all() });
    });
    return router;
}
function firstNonInternalIp() {
    const interfaces = os.networkInterfaces();
    for (const rows of Object.values(interfaces)) {
        for (const row of rows ?? []) {
            if (row.family === 'IPv4' && !row.internal)
                return row.address;
        }
    }
    return '127.0.0.1';
}
function csvFromRows(rows) {
    if (!rows.length)
        return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map((header) => JSON.stringify(row[header] ?? '')).join(','));
    }
    return lines.join('\n');
}
function isFirstRun() {
    const teamCount = db.prepare('SELECT COUNT(*) AS count FROM teams').get();
    const companyCount = db.prepare('SELECT COUNT(*) AS count FROM companies').get();
    return teamCount.count === 0 || companyCount.count === 0;
}
