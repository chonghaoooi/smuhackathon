import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';

type Company = { id: string; name: string; ticker: string; industry: string; description: string; sector: string; price: number; volume: number; revenue: number; profit: number; debt: number; dividend_yield: number };
type CompanyProfile = { hq?: string; founded?: string; ceo?: string; focus?: string; scenario?: string; news?: string };
type Article = { id: string; title: string; body: string; category: string; published: number; impact_type: string; created_at: string };
type Notification = { id: string; title: string; body: string; type: string; priority: number; pinned: number; created_at: string };
type Quiz = { id: string; question: string; options: string[]; answer_index: number; reward: number; active: number };
type Point = { created_at: string; value: number };
type Transaction = { created_at: string; ticker: string; company_name: string; action: string; quantity: number; price: number };

const COMPANY_INTELLIGENCE: Record<string, { focus: string; scenario: string; hq: string; founded: string; ceo: string; news: string }> = {
  AUR: {
    focus: 'Fast-chip design for localized LLM and AI workloads.',
    scenario: 'A late-stage hardware bug could delay launches and scare off cloud supply contracts.',
    hq: 'Austin, Texas',
    founded: '2018',
    ceo: 'Maya Chen',
    news: 'Rumors of a new AI inference chip are keeping enterprise buyers interested.'
  },
  BHB: {
    focus: 'Regional banking built around local lending and commercial real estate.',
    scenario: 'A wave of loan defaults would pressure margins and force bigger loss provisions.',
    hq: 'Charlotte, North Carolina',
    founded: '1996',
    ceo: 'Daniel Rivera',
    news: 'Management has been quietly increasing its reserve coverage and loan book discipline.'
  },
  CBM: {
    focus: 'Industrial EV manufacturing for fleet logistics and heavy transport.',
    scenario: 'A battery supply chain disruption could freeze assembly lines and delay deliveries.',
    hq: 'Detroit, Michigan',
    founded: '2012',
    ceo: 'Ava Thompson',
    news: 'Fleet operators are watching for a new heavy-duty battery platform announcement.'
  },
  DLT: {
    focus: 'Consumer staples and high-protein food distribution at national scale.',
    scenario: 'A product recall could damage brand trust and trigger reverse-logistics costs.',
    hq: 'Chicago, Illinois',
    founded: '1987',
    ceo: 'Priya Shah',
    news: 'Retail buyers are tracking its expansion into plant-based and high-protein SKUs.'
  },
  EVG: {
    focus: 'Utility-style clean energy generation from solar and wind contracts.',
    scenario: 'A policy or demand shift could squeeze contracted growth and financing expectations.',
    hq: 'Denver, Colorado',
    founded: '2009',
    ceo: 'Ethan Brooks',
    news: 'Grid-storage partnerships are helping the company diversify beyond simple generation.'
  },
  FRS: {
    focus: 'Biotech research with specialty therapies and IP-heavy upside.',
    scenario: 'A trial setback or regulatory issue could rapidly reset valuation expectations.',
    hq: 'Cambridge, Massachusetts',
    founded: '2015',
    ceo: 'Sofia Patel',
    news: 'Investors are waiting for the next readout from its advanced therapy pipeline.'
  },
  GFD: {
    focus: 'AI-driven freight routing and shipping infrastructure.',
    scenario: 'A cyberattack on routing hubs could stall freight and trigger costly recovery work.',
    hq: 'Kansas City, Missouri',
    founded: '2004',
    ceo: 'Marcus Lee',
    news: 'The company is expanding automated routing hubs after a strong logistics quarter.'
  },
  HRZ: {
    focus: 'Streaming-first entertainment studio focused on owned IP.',
    scenario: 'A big-budget franchise flop would hit margins and force large write-downs.',
    hq: 'Los Angeles, California',
    founded: '2001',
    ceo: 'Elena Carter',
    news: 'A new sci-fi franchise slate is driving speculation about subscriber growth.'
  },
  ION: {
    focus: 'Mall and commercial real-estate operator shifting to mixed-use destinations.',
    scenario: 'Weak consumer traffic can leave reconfigured properties expensive to re-lease.',
    hq: 'Dallas, Texas',
    founded: '1994',
    ceo: 'Noah Kim',
    news: 'Tenant mix changes are pushing the stock as investors debate the retail-to-experience pivot.'
  },
  JDM: {
    focus: 'Rare-earth mining and resource extraction for batteries and electronics.',
    scenario: 'Environmental or safety issues could halt mining and burn through fixed costs.',
    hq: 'Perth, Australia',
    founded: '2006',
    ceo: 'Amara Singh',
    news: 'Demand for battery metals is keeping the company on watchlists across the market.'
  }
};

const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

const EMPTY_TEAM_DASHBOARD = {
  team: { name: 'No team data yet', cash: 0, portfolio_value: 0, net_worth: 0 },
  market: { status: 'No market data yet' },
  news: [] as Article[],
  notifications: [] as Notification[],
  history: [] as Array<Record<string, any>>,
  holdings: [] as Array<Record<string, any>>
};

const EMPTY_ADMIN_OVERVIEW = {
  teams: { count: 0 },
  hiddenTeams: { count: 0 },
  totalTeams: { count: 0 },
  companies: { count: 0 },
  market: { status: 'No market data yet' },
  totalMoney: { total: 0 },
  totalMarketValue: { total: 0 },
  diagnostics: { socketConnections: 0, serverIp: 'Not available', connectedUsers: 0, connectedTeams: 0, dbHealth: false, lastBackupTime: null },
  leaderboard: [] as Array<Record<string, any>>,
  logs: [] as Array<Record<string, any>>,
  backups: [] as Array<Record<string, any>>
};

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '');
  const [role, setRole] = useState(localStorage.getItem('role') ?? '');
  const [userId, setUserId] = useState(localStorage.getItem('userId') ?? '');
  const login = (nextToken: string, nextRole: string, nextUserId: string) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('role', nextRole);
    localStorage.setItem('userId', nextUserId);
    setToken(nextToken);
    setRole(nextRole);
    setUserId(nextUserId);
  };
  const logout = () => {
    localStorage.clear();
    setToken('');
    setRole('');
    setUserId('');
  };
  return { token, role, userId, login, logout };
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function StatGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return <div className="stat-grid">{items.map((item) => <Card key={item.label}><div className="muted">{item.label}</div><div className="stat">{item.value}</div></Card>)}</div>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, any>> }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{renderCell(row[column])}</td>)}</tr>)}</tbody></table></div>;
}

function MiniLineChart({ points, positive = true }: { points: Point[]; positive?: boolean }) {
  const [hovered, setHovered] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  if (!points.length) return <p className="muted">No chart data yet.</p>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const minLabel = Math.floor(min);
  const maxLabel = Math.ceil(max);
  const midLabel = Math.round((min + max) / 2);
  const width = 720;
  const height = 180;
  const pad = 18;
  const span = Math.max(max - min, 1);
  const coords = points.map((point, index) => ({
    x: pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1),
    y: height - pad - ((point.value - min) * (height - pad * 2)) / span
  }));
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const latest = values[values.length - 1];
  const start = values[0];
  const trendClass = latest >= start ? 'positive' : 'negative';
  return (
    <div className={`chart-frame ${trendClass}`}>
      <div className="chart-title-row">
        <strong>{positive ? 'Value trend' : 'Trend'}</strong>
        <span className="muted tiny">Y axis: Cashbux</span>
      </div>
      <div className="chart-wrap">
        {hovered ? (
          <div className="chart-tooltip" style={{ left: `${hovered.x}px`, top: `${hovered.y}px` }}>
            <strong>{hovered.value} Cashbux</strong>
            <span className="muted tiny">{hovered.label}</span>
          </div>
        ) : null}
        <div className="chart-y-axis">
          <span>{maxLabel}</span>
          <span>{midLabel}</span>
          <span>{minLabel}</span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="mini-chart" role="img" aria-label="Line chart">
          <path d={path} />
          {coords.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              onMouseEnter={() => setHovered({ x: point.x, y: point.y - 42, label: points[index].created_at, value: points[index].value })}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
      </div>
      <div className="chart-axis-labels"><span className="muted tiny">Oldest</span><span className="muted tiny">Time</span><span className="muted tiny">Newest</span></div>
    </div>
  );
}

function renderCell(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function extractErrorMessage(error: unknown) {
  const text = String(error).replace(/^Error:\s*/, '');
  const match = text.match(/\{"error":"([^"]+)"\}/);
  return match ? match[1] : text;
}

function parseMaybeJson(value: any) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatActionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function logKind(action: string) {
  if (action.includes('snapshot')) return 'Snapshot';
  if (action.includes('team')) return 'Team';
  if (action.includes('company')) return 'Company';
  if (action.includes('market')) return 'Market';
  if (action.includes('quiz')) return 'Quiz';
  if (action.includes('notification')) return 'Notification';
  if (action.includes('backup')) return 'Backup';
  if (action.includes('article') || action.includes('news')) return 'News';
  return 'General';
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <Card><h3>{title}</h3><p className="muted">{text}</p></Card>;
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <Card className="hero-card">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
    </Card>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="action-row">{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function AppShell({ title, token, role, logout, connectionStatus, children }: { title: string; token: string; role: string; logout: () => void; connectionStatus?: string; children: React.ReactNode }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [drawerItems, setDrawerItems] = useState<Array<{ id: string; title: string; body: string; type: 'news' | 'notification' }>>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ news: Number(localStorage.getItem('cashbux_news_badge') ?? 0), notifications: Number(localStorage.getItem('cashbux_notification_badge') ?? 0) });
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(apiBase.replace(/\/api$/, ''));
    socket.on('disconnect', () => setLiveStatus('disconnected'));
    socket.on('connect', () => setLiveStatus('connected'));
    socket.on('reconnect_attempt', () => setLiveStatus('reconnecting'));
    const pushItem = (type: 'news' | 'notification', title: string, body: string) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      setDrawerOpen(true);
      setDrawerItems((current) => [{ id, title, body, type }, ...current].slice(0, 4));
      setBadgeCounts((current) => {
        const next = type === 'news'
          ? { ...current, news: current.news + 1 }
          : { ...current, notifications: current.notifications + 1 };
        localStorage.setItem('cashbux_news_badge', String(next.news));
        localStorage.setItem('cashbux_notification_badge', String(next.notifications));
        return next;
      });
    };
    socket.on('notification-created', (payload?: { title?: string; body?: string }) => pushItem('notification', payload?.title ?? 'New notification', payload?.body ?? 'A game-master notification just arrived.'));
    socket.on('news-published', (payload?: { articleId?: string; source?: string; affectedTeams?: number; targetType?: string; targetValue?: string }) => {
      const body = payload?.source === 'market-event'
        ? `A market event affected ${payload.targetType ?? 'market'}${payload.targetValue ? `: ${payload.targetValue}` : ''}.`
        : 'A fresh market story just dropped.';
      pushItem('news', 'New news item', body);
    });
    const pingPresence = () => {
      void apiPost('/presence/ping', {}, token).catch(() => undefined);
    };
    pingPresence();
    const heartbeat = window.setInterval(pingPresence, 30000);
    return () => {
      window.clearInterval(heartbeat);
      socket.close();
    };
  }, [token]);
  const displayedStatus = connectionStatus ?? liveStatus;
  const dismissDrawerItem = (id: string) => setDrawerItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className={`app-frame ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
      {mobileMenuOpen ? <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} /> : null}
      <aside className="sidebar">
        <div>
          <div className="brand">Cashbux</div>
          <p className="muted">Offline LAN event market</p>
        </div>
        <div className="menu-group">
          <div className="menu-label">Session</div>
          {!token ? <Link to="/">Login</Link> : null}
          <Link to="/status">Status</Link>
          {token ? <button className="secondary" onClick={() => { logout(); window.location.href = '/'; }}>Logout / Switch Account</button> : null}
        </div>
        <div className="menu-group">
          <div className="menu-label">Team Menu</div>
          <Link to="/team/dashboard">Dashboard</Link>
          <Link to="/team/market">Market</Link>
          <Link to="/team/company">Company Details</Link>
          <Link to="/team/portfolio">Portfolio</Link>
          <Link to="/team/history">Trading History</Link>
          <Link to="/team/news">News {badgeCounts.news ? <span className="menu-badge">{badgeCounts.news}</span> : null}</Link>
          <Link to="/team/leaderboard">Leaderboard</Link>
          <Link to="/team/notifications">Notifications {badgeCounts.notifications ? <span className="menu-badge">{badgeCounts.notifications}</span> : null}</Link>
          <Link to="/team/watchlist">Watchlist</Link>
        </div>
        {role === 'admin' ? (
          <div className="menu-group">
            <div className="menu-label">Admin Menu</div>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/company">Company Detail Hub</Link>
            <Link to="/admin/teams">Team Management</Link>
            <Link to="/admin/companies">Company Management</Link>
            <Link to="/admin/market">Market Controls</Link>
            <Link to="/admin/news">News Management</Link>
            <Link to="/admin/notifications">Notification Management</Link>
            <Link to="/admin/snapshots">Snapshot Management</Link>
            <Link to="/admin/events">Event Logs</Link>
            <Link to="/admin/network">Network Diagnostics</Link>
            <Link to="/admin/backups">Backup Management</Link>
          </div>
        ) : null}
        <p className="muted tiny">Current role: {role || 'guest'}</p>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title-row">
              <button className="menu-toggle secondary" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Toggle menu">
                Menu
              </button>
              <h1>{title}</h1>
            </div>
            <p className="muted">Cashbux investing event control center</p>
          </div>
          <div className="topbar-actions">
            <button className="bell-button secondary" type="button" aria-label="Notifications" onClick={() => setDrawerOpen((value) => !value)}>
              <span className="bell-icon">🔔</span>
              {badgeCounts.news + badgeCounts.notifications ? <span className="bell-badge">{badgeCounts.news + badgeCounts.notifications}</span> : null}
            </button>
            {displayedStatus ? <span className={`conn conn-${displayedStatus}`}>{displayedStatus}</span> : null}
          </div>
        </header>
        {drawerOpen && drawerItems.length ? (
          <div className="notification-drawer">
            {drawerItems.map((item) => (
              <div key={item.id} className={`drawer-card drawer-${item.type}`}>
                <div className="drawer-head">
                  <strong>{item.title}</strong>
                  <button className="drawer-close" onClick={() => dismissDrawerItem(item.id)} aria-label="Dismiss notification">x</button>
                </div>
                <p className="muted">{item.body}</p>
              </div>
            ))}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

function LoginPage({ login }: { login: (token: string, role: string, userId: string) => void }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await apiPost<{ token: string; role: string }>('/auth/login', { username, password });
      const payload = JSON.parse(atob(data.token.split('.')[1])) as { sub: string; role: string };
      login(data.token, data.role, payload.sub);
      navigate(data.role === 'admin' ? '/admin' : '/team/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return <div className="auth-shell"><Card className="auth-card"><h2>Login</h2><p className="muted">Use the team or admin credentials provided by the game master.</p><div className="stack"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" /><button onClick={submit} disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>{error ? <div className="error">Error: {error}</div> : null}</div></Card></div>;
}

function StatusPage({ token, role }: { token: string; role: string }) {
  const [data, setData] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { apiGet('/health').then(setData); }, []);
  useEffect(() => {
    if (!token) return;
    apiPost('/auth/session', {}, token).then(setSession).catch(() => setSession(null));
  }, [token]);
  const refresh = async () => {
    const next = await apiGet('/health');
    setData(next);
    if (token) {
      const nextSession = await apiPost('/auth/session', {}, token).catch(() => null);
      setSession(nextSession);
    }
  };
  const runAdminAction = async (label: string, path: string, payload: unknown = {}) => {
    setBusy(label);
    try {
      await apiPost(path, payload, token);
      await refresh();
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="auth-shell">
      <div className="stack wide-stack">
        <ActionRow><Link className="secondary back-link" to={role === 'admin' ? '/admin' : '/team/dashboard'}>Back</Link></ActionRow>
        <Card className="status-card">
          <h2>System Status</h2>
          <div className="stack">
            <div className="status-line"><span>Backend</span><strong>{data?.ok ? 'Online' : 'Checking...'}</strong></div>
            <div className="status-line"><span>First Run</span><strong>{data?.firstRun ? 'Yes' : 'No'}</strong></div>
            <div className="status-line"><span>Market</span><strong>{data?.market?.status ?? 'Unknown'}</strong></div>
            <div className="status-line"><span>Session</span><strong>{session?.auth ? `${session.auth.role} / ${session.auth.sub}` : 'Not verified'}</strong></div>
          </div>
        </Card>
        {role === 'admin' ? (
          <Card className="status-card">
            <h2>Admin System Actions</h2>
            <p className="muted">Use these controls for common game-master tasks.</p>
            <div className="stack">
              <ActionRow>
                <button onClick={() => runAdminAction('open', '/admin/open-market')} disabled={busy !== ''}>Open Market</button>
                <button onClick={() => runAdminAction('close', '/admin/close-market')} disabled={busy !== ''}>Close Market</button>
              </ActionRow>
              <ActionRow>
                <button onClick={() => runAdminAction('pause', '/admin/pause-market')} disabled={busy !== ''}>Pause Market</button>
                <button className="secondary" onClick={() => runAdminAction('backup', '/admin/backup')} disabled={busy !== ''}>Create Backup</button>
              </ActionRow>
              <button
                className="secondary"
                onClick={() => {
                  if (window.confirm('Reset the entire event and restore the default teams, companies, and quiz?')) {
                    void runAdminAction('reset', '/admin/reset-event');
                  }
                }}
                disabled={busy !== ''}
              >
                Reset Event
              </button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function TeamDashboard({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    apiGet<any>(`/team/${userId}/dashboard`, token).then(setData).catch(() => setData(EMPTY_TEAM_DASHBOARD));
  }, [token, userId]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  const networthPoints = data.history.map((point: any) => ({ created_at: point.created_at, value: Number(point.networth) }));
  const trades = data.transactions ?? [];
  return <AppShell title="Team Dashboard" token={token} role={role} logout={() => localStorage.clear()}><StatGrid items={[{ label: 'Team', value: data.team.name }, { label: 'Cashbux', value: data.team.cash }, { label: 'Portfolio Value', value: data.team.portfolio_value }, { label: 'Net Worth', value: data.team.net_worth }, { label: 'Market', value: data.market.status }]} /><div className="grid-2"><Card><h3>Latest News</h3>{data.news.length ? data.news.map((article: Article) => <p key={article.id}><strong>{article.title}</strong><br />{article.body}</p>) : <p className="muted">No news yet.</p>}</Card><Card><h3>Notifications</h3>{data.notifications.length ? data.notifications.map((note: Notification) => <div key={note.id} className="notification-item"><strong>{note.type === 'trade' ? 'Trade' : note.type === 'admin' ? 'Announcement' : 'System'}</strong><p>{note.title}</p><p className="muted">{note.body}</p></div>) : <p className="muted">No notifications.</p>}</Card></div><div className="grid-2"><Card><h3>Portfolio History</h3>{data.history.length ? <div className="stack"><MiniLineChart points={networthPoints} /><DataTable columns={['created_at', 'networth']} rows={data.history} /></div> : <p className="muted">No history yet.</p>}</Card><Card><h3>Trades</h3>{trades.length ? <DataTable columns={['created_at', 'ticker', 'company_name', 'action', 'quantity', 'price']} rows={trades} /> : <p className="muted">No trades yet.</p>}</Card></div><div className="grid-2"><Card><h3>Holdings</h3>{data.holdings.length ? <DataTable columns={['ticker', 'name', 'quantity', 'avg_price', 'price', 'sector']} rows={data.holdings} /> : <p className="muted">No holdings yet.</p>}</Card><Card><h3>News Feed</h3>{data.news.length ? data.news.map((article: Article) => <div key={article.id} className="notification-item"><strong>{article.title}</strong><p className="muted">{article.body}</p></div>) : <p className="muted">No news yet.</p>}</Card></div></AppShell>;
}

function MarketPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [market, setMarket] = useState<{ companies: Company[] } | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'ticker' | 'price' | 'name'>('ticker');
  const navigate = useNavigate();
  useEffect(() => { apiGet<{ companies: Company[] }>('/market', token).then(setMarket).catch(() => setMarket({ companies: [] })); }, [token]);
  const companies = useMemo(() => {
    const list = market?.companies.filter((company) => `${company.name} ${company.ticker}`.toLowerCase().includes(search.toLowerCase())) ?? [];
    return [...list].sort((left, right) => sort === 'price' ? right.price - left.price : sort === 'name' ? left.name.localeCompare(right.name) : left.ticker.localeCompare(right.ticker));
  }, [market, search, sort]);
  if (!market) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Market" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><div className="toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies" /><select value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="ticker">Sort by ticker</option><option value="name">Sort by name</option><option value="price">Sort by price</option></select></div><div className="company-list">{companies.map((company) => <Card key={company.id}><div className="row"><div><h3>{company.name} ({company.ticker})</h3><p className="muted">{company.industry} · {company.sector}</p><p className="tiny">{company.description}</p></div><div><strong>{company.price} Cashbux</strong><p className="muted">Vol {company.volume}</p><ActionRow><button onClick={() => navigate(`/team/company?company=${company.id}`)}>View details</button></ActionRow></div></div></Card>)}</div></AppShell>;
}

function CompanyDetailsPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const location = useLocation();
  const [market, setMarket] = useState<{ companies: Company[] } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [editForm, setEditForm] = useState<any>(null);
  const isAdmin = role === 'admin';
  useEffect(() => {
    apiGet<{ companies: Company[] }>('/market', token).then((data) => {
      setMarket(data);
      const params = new URLSearchParams(location.search);
      setSelectedId((current) => current || params.get('company') || data.companies[0]?.id || '');
    }).catch(() => setMarket({ companies: [] }));
  }, [token, location.search]);
  useEffect(() => {
    if (!selectedId) return;
    apiGet<any>(`/company/${selectedId}`, token).then((data) => {
      setSelected(data);
      setEditForm({ ...data.company, ...data.profile });
    }).catch(() => setSelected(null));
  }, [selectedId, token]);
  const company = selected?.company ?? market?.companies.find((item) => item.id === selectedId) ?? null;
  const profile: CompanyProfile | null = selected?.profile ?? COMPANY_INTELLIGENCE[company?.ticker ?? ''] ?? null;
  const intel = company ? profile : null;
  const articles = selected?.articles ?? [];
  const buy = async () => {
    setMessage('');
    try {
      const result = await apiPost<{ ok: boolean; quantity: number }>('/trade/buy', { teamId: userId, companyId: selectedId, quantity }, token);
      setMessage(`Buy order completed for ${result.quantity} share(s).`);
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const sell = async () => {
    setMessage('');
    try {
      const result = await apiPost<{ ok: boolean; quantity: number }>('/trade/sell', { teamId: userId, companyId: selectedId, quantity }, token);
      setMessage(`Sell order completed for ${result.quantity} share(s).`);
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const watch = async () => {
    setMessage('');
    try {
      await apiPost('/watchlist', { teamId: userId, companyId: selectedId }, token);
      setMessage('Added to watchlist.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const saveCompany = async () => {
    if (!editForm) return;
    setMessage('');
    try {
      await apiPost('/admin/company', { id: selectedId, ...editForm }, token);
      const next = await apiGet<any>(`/company/${selectedId}`, token);
      setSelected(next);
      setEditForm({ ...next.company, ...next.profile });
      setMessage('Company updated.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const setCompanyPrice = async () => {
    if (!editForm) return;
    setMessage('');
    try {
      await apiPost(`/admin/company/${selectedId}/price`, { price: editForm.price }, token);
      const next = await apiGet<any>(`/company/${selectedId}`, token);
      setSelected(next);
      setEditForm({ ...next.company, ...next.profile });
      setMessage('Price updated.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const setCompanyDividend = async () => {
    if (!editForm) return;
    setMessage('');
    try {
      await apiPost(`/admin/company/${selectedId}/dividend`, { dividend_yield: editForm.dividend_yield }, token);
      const next = await apiGet<any>(`/company/${selectedId}`, token);
      setSelected(next);
      setEditForm({ ...next.company, ...next.profile });
      setMessage('Dividend yield updated.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  const deleteCompany = async () => {
    setMessage('');
    try {
      await apiDelete(`/admin/company/${selectedId}`, token);
      const next = await apiGet<{ companies: Company[] }>('/market', token);
      setMarket(next);
      const fallbackId = next.companies[0]?.id ?? '';
      setSelectedId(fallbackId);
      if (fallbackId) {
        const detail = await apiGet<any>(`/company/${fallbackId}`, token);
        setSelected(detail);
        setEditForm({ ...detail.company, ...detail.profile });
      } else {
        setSelected(null);
        setEditForm(null);
      }
      setMessage('Company deleted.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };
  return (
    <AppShell title="Company Details" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected">
      <PageIntro eyebrow="Company overview" title="Track a company and manage it from one screen" text="Teams can trade from this page, and admins can update company data without leaving the browser." />
      <div className="toolbar">
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {(market?.companies ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.ticker})</option>)}
        </select>
        {!isAdmin ? <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} placeholder="Enter any number" /> : null}
        {!isAdmin ? <button onClick={buy} className="trade-buy">Buy</button> : null}
        {!isAdmin ? <button onClick={sell} className="trade-sell">Sell</button> : null}
        {!isAdmin ? <button onClick={watch} className="secondary">Watchlist</button> : null}
      </div>
      {message ? <Card><p className="muted">{message}</p></Card> : null}
      {company ? (
        <div className="grid-2">
          <Card>
            <h2>{company.name}</h2>
            <p className="muted">{company.ticker} · {company.industry}</p>
            <p>{company.description}</p>
            {intel ? (
              <div className="grid-3">
                <Card><div className="eyebrow">About</div><p>{intel.focus}</p><p className="muted tiny">{intel.news}</p></Card>
                <Card><div className="eyebrow">Financials</div><div className="status-line"><span>HQ</span><strong>{intel.hq}</strong></div><div className="status-line"><span>Founded</span><strong>{intel.founded}</strong></div><div className="status-line"><span>CEO</span><strong>{intel.ceo}</strong></div></Card>
                <Card><div className="eyebrow">Risk</div><p>{intel.scenario}</p></Card>
              </div>
            ) : null}
            <div className="stack">
              <div className="status-line"><span>Sector</span><strong>{company.sector}</strong></div>
              <div className="status-line"><span>Price</span><strong>{company.price}</strong></div>
              <div className="status-line"><span>Revenue</span><strong>{company.revenue}</strong></div>
              <div className="status-line"><span>Profit</span><strong>{company.profit}</strong></div>
              <div className="status-line"><span>Debt</span><strong>{company.debt}</strong></div>
              <div className="status-line"><span>Dividend Yield</span><strong>{company.dividend_yield}%</strong></div>
            </div>
          </Card>
          <Card>
            <h3>Related Articles</h3>
            {articles.length ? articles.map((article: Article) => <p key={article.id}><strong>{article.title}</strong><br />{article.body}</p>) : <p className="muted">No related articles yet.</p>}
          </Card>
          <Card>
            <h3>Price History</h3>
            {selected?.history?.length ? <MiniLineChart points={selected.history.map((row: any) => ({ created_at: row.created_at, value: Number(row.price) }))} /> : <p className="muted">No price history yet.</p>}
          </Card>
          {role === 'admin' ? (
            <Card>
              <h3>Admin Controls</h3>
              <FormGrid>
                <input value={editForm?.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Company name" />
                <input value={editForm?.ticker ?? ''} onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value })} placeholder="Ticker" />
                <input value={editForm?.industry ?? ''} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} placeholder="Industry" />
                <input value={editForm?.sector ?? ''} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} placeholder="Sector" />
                <textarea value={editForm?.description ?? ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
                <div className="grid-2">
                  <input type="number" value={editForm?.price ?? 0} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} placeholder="Price" />
                  <input type="number" value={editForm?.volume ?? 0} onChange={(e) => setEditForm({ ...editForm, volume: Number(e.target.value) })} placeholder="Volume" />
                <input type="number" value={editForm?.revenue ?? 0} onChange={(e) => setEditForm({ ...editForm, revenue: Number(e.target.value) })} placeholder="Revenue" />
                <input type="number" value={editForm?.profit ?? 0} onChange={(e) => setEditForm({ ...editForm, profit: Number(e.target.value) })} placeholder="Profit" />
                <input type="number" value={editForm?.debt ?? 0} onChange={(e) => setEditForm({ ...editForm, debt: Number(e.target.value) })} placeholder="Debt" />
                <input type="number" value={editForm?.dividend_yield ?? 0} onChange={(e) => setEditForm({ ...editForm, dividend_yield: Number(e.target.value) })} placeholder="Dividend yield" />
                <input value={editForm?.hq ?? ''} onChange={(e) => setEditForm({ ...editForm, hq: e.target.value })} placeholder="Headquarters" />
                <input value={editForm?.founded ?? ''} onChange={(e) => setEditForm({ ...editForm, founded: e.target.value })} placeholder="Founded" />
                <input value={editForm?.ceo ?? ''} onChange={(e) => setEditForm({ ...editForm, ceo: e.target.value })} placeholder="CEO" />
                <textarea value={editForm?.focus ?? ''} onChange={(e) => setEditForm({ ...editForm, focus: e.target.value })} placeholder="Business focus" />
                <textarea value={editForm?.scenario ?? ''} onChange={(e) => setEditForm({ ...editForm, scenario: e.target.value })} placeholder="Risk scenario" />
                <textarea value={editForm?.news ?? ''} onChange={(e) => setEditForm({ ...editForm, news: e.target.value })} placeholder="News blurb" />
              </div>
              </FormGrid>
              <ActionRow>
                <button onClick={saveCompany}>Save company</button>
                <button className="secondary" onClick={setCompanyPrice}>Update price</button>
                <button className="secondary" onClick={setCompanyDividend}>Update dividend</button>
                <button className="secondary" onClick={deleteCompany}>Delete company</button>
              </ActionRow>
            </Card>
          ) : null}
        </div>
      ) : (
        <EmptyState title="No company selected" text="Choose a company from the dropdown to view details, news, and trading actions." />
      )}
    </AppShell>
  );
}

function PortfolioPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any>({ transactions: [] });
  useEffect(() => {
    apiGet<any>(`/team/${userId}/dashboard`, token).then(setData).catch(() => setData({ team: { cash: 0, portfolio_value: 0, net_worth: 0 }, holdings: [], history: [] }));
    apiGet<any>(`/portfolio/${userId}`, token).catch(() => setData((current: any) => current ?? { team: { cash: 0, portfolio_value: 0, net_worth: 0 }, holdings: [] }));
    apiGet<any>(`/transactions/${userId}`, token).then(setHistory).catch(() => setHistory({ transactions: [] }));
  }, [token, userId]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  const points = (data.history ?? []).map((point: any) => ({ created_at: point.created_at, value: Number(point.networth) }));
  return <AppShell title="Portfolio" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><StatGrid items={[{ label: 'Cash', value: data.team.cash }, { label: 'Portfolio Value', value: data.team.portfolio_value }, { label: 'Net Worth', value: data.team.net_worth }]} /><div className="grid-2"><Card><h3>Value Trend</h3>{points.length ? <MiniLineChart points={points} /> : <p className="muted">No portfolio movement yet.</p>}</Card><Card><h3>Trade History</h3>{history.transactions?.length ? <DataTable columns={['created_at', 'ticker', 'company_name', 'action', 'quantity', 'price']} rows={history.transactions} /> : <p className="muted">No trades yet.</p>}</Card></div><Card>{data.holdings.length ? <DataTable columns={['ticker', 'name', 'quantity', 'avg_price', 'price', 'sector']} rows={data.holdings} /> : <p className="muted">No holdings yet.</p>}</Card></AppShell>;
}

function HistoryPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet<any>(`/transactions/${userId}`, token).then(setData).catch(() => setData({ transactions: [] })); }, [token, userId]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Trading History" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><Card>{data.transactions.length ? <DataTable columns={['created_at', 'ticker', 'company_name', 'action', 'quantity', 'price']} rows={data.transactions} /> : <p className="muted">No trades yet.</p>}</Card></AppShell>;
}

function NewsPage({ token, role }: { token: string; role: string }) {
  const [data, setData] = useState<{ articles: Article[] } | null>(null);
  useEffect(() => { apiGet<{ articles: Article[] }>('/news', token).then(setData).catch(() => setData({ articles: [] })); }, [token]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="News" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected">{data.articles.length ? <div className="grid-2">{data.articles.map((article) => <Card key={article.id}><h3>{article.title}</h3><p className="muted">{article.category} · {article.impact_type}</p><p>{article.body}</p></Card>)}</div> : <Card><p className="muted">No news yet.</p></Card>}</AppShell>;
}

function LeaderboardPage({ token, role }: { token: string; role: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet<any>('/leaderboard', token).then(setData).catch(() => setData({ teams: [] })); }, [token]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Leaderboard" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><Card><DataTable columns={['name', 'cash', 'portfolio_value', 'net_worth']} rows={data.teams} /></Card></AppShell>;
}

function NotificationsPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet<any>(`/notifications/${userId}`, token).then(setData).catch(() => setData({ notifications: [] })); }, [token, userId]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  const tradeNotes = data.notifications.filter((note: Notification) => note.type === 'trade');
  const announcementNotes = data.notifications.filter((note: Notification) => note.type === 'admin');
  const systemNotes = data.notifications.filter((note: Notification) => !['trade', 'admin'].includes(note.type));
  return <AppShell title="Notifications" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><div className="grid-2"><Card><h3>Trade Alerts</h3>{tradeNotes.length ? tradeNotes.map((note: Notification) => <div key={note.id} className="notification-item"><strong>{note.title}</strong><p className="muted">{note.body}</p></div>) : <p className="muted">No trade alerts.</p>}</Card><Card><h3>Announcements</h3>{announcementNotes.length ? announcementNotes.map((note: Notification) => <div key={note.id} className="notification-item"><strong>{note.title}</strong><p className="muted">{note.body}</p></div>) : <p className="muted">No announcements.</p>}</Card></div><Card><h3>System</h3>{systemNotes.length ? systemNotes.map((note: Notification) => <div key={note.id} className="notification-item"><strong>{note.title}</strong><p className="muted">{note.body}</p></div>) : <p className="muted">No system notifications.</p>}</Card></AppShell>;
}

function WatchlistPage({ token, userId, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => apiGet<any>(`/watchlist/${userId}`, token).then(setData).catch(() => setData({ watchlist: [] }));
  useEffect(() => { refresh(); }, [token, userId]);
  const remove = async (companyId: string) => { await apiDelete(`/watchlist/${userId}/${companyId}`, token); refresh(); };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Watchlist" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected"><Card>{data.watchlist.length ? <div className="grid-2">{data.watchlist.map((item: Company) => <Card key={item.id}><h3>{item.name}</h3><p className="muted">{item.ticker} · {item.industry}</p><p>{item.price} Cashbux</p><ActionRow><button className="secondary" onClick={() => remove(item.id)}>Remove</button></ActionRow></Card>)}</div> : <p className="muted">Your watchlist is empty.</p>}</Card></AppShell>;
}

function AdminPage({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet<any>('/admin/overview', token).then(setData).catch(() => setData(EMPTY_ADMIN_OVERVIEW)); }, [token]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return (
    <AppShell title="Admin Dashboard" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected">
      <PageIntro eyebrow="Control center" title="Manage the whole event from one workspace" text="Jump into teams, companies, market controls, news, notifications, quizzes, snapshots, and backups from the browser." />
      <StatGrid items={[{ label: 'Active Teams', value: data.teams.count }, { label: 'Hidden Teams', value: data.hiddenTeams.count }, { label: 'All Teams', value: data.totalTeams.count }, { label: 'Companies', value: data.companies.count }, { label: 'Total Cash', value: data.totalMoney.total }, { label: 'Sockets', value: data.diagnostics.socketConnections }]} />
      <div className="grid-2">
        <Card>
          <h3>Quick Actions</h3>
          <div className="quick-grid">
            <Link className="quick-link" to="/admin/teams">Team Management</Link>
            <Link className="quick-link" to="/admin/companies">Company Management</Link>
            <Link className="quick-link" to="/admin/company">Company Detail Hub</Link>
            <Link className="quick-link" to="/admin/market">Market Controls</Link>
            <Link className="quick-link" to="/admin/news">News Management</Link>
            <Link className="quick-link" to="/admin/notifications">Notifications</Link>
            <Link className="quick-link" to="/admin/snapshots">Snapshots</Link>
            <Link className="quick-link" to="/admin/backups">Backups</Link>
            <Link className="quick-link" to="/admin/network">Diagnostics</Link>
          </div>
        </Card>
        <Card>
          <h3>Network</h3>
          <div className="stack">
            <div className="status-line"><span>Server IP</span><strong>{data.diagnostics.serverIp}</strong></div>
            <div className="status-line"><span>Connected Devices</span><strong>{data.diagnostics.connectedUsers}</strong></div>
            <div className="status-line"><span>Connected Teams</span><strong>{data.diagnostics.connectedTeams.count ?? data.diagnostics.connectedTeams}</strong></div>
            <div className="status-line"><span>Hidden Teams</span><strong>{data.hiddenTeams.count ?? data.hiddenTeams ?? 0}</strong></div>
            <div className="status-line"><span>Database Health</span><strong>{data.diagnostics.dbHealth ? 'Healthy' : 'Problem'}</strong></div>
            <div className="status-line"><span>Last Backup</span><strong>{data.diagnostics.lastBackupTime?.created_at ?? 'None'}</strong></div>
          </div>
        </Card>
      </div>
      <Card>
        <h3>Leaderboard</h3>
        <DataTable columns={['name', 'cash', 'portfolio_value', 'net_worth']} rows={data.leaderboard} />
      </Card>
      <div className="grid-2">
        <Card>
          <h3>Event Logs</h3>
          <DataTable columns={['created_at', 'action', 'details']} rows={data.logs} />
        </Card>
        <Card>
          <h3>Backups</h3>
          <DataTable columns={['created_at', 'file_name', 'kind']} rows={data.backups} />
        </Card>
      </div>
      <Card><h3>Current User</h3><p className="muted">{userId}</p><div className="status-line"><span>Market Status</span><strong>{data.market?.status ?? 'Unknown'}</strong></div></Card>
    </AppShell>
  );
}

function TeamManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', cash: 5000, hidden: false });
  const [editId, setEditId] = useState('');
  const [query, setQuery] = useState('');
  const load = () => apiGet('/admin/teams', token).then(setData).catch(() => setData({ teams: [] }));
  useEffect(() => { load(); }, [token]);
  const save = async () => { await apiPost('/admin/team', { id: editId || undefined, ...form }, token); setEditId(''); setForm({ name: '', username: '', password: '', cash: 5000, hidden: false }); load(); };
  const remove = async (id: string) => { await apiDelete(`/admin/team/${id}`, token); load(); };
  const edit = (team: any) => { setEditId(team.id); setForm({ name: team.name, username: team.username, password: '', cash: team.cash, hidden: Boolean(team.hidden) }); };
  const toggleHidden = async (team: any) => {
    await apiPost(`/admin/team/${team.id}/visibility`, { hidden: !team.hidden }, token);
    load();
  };
  const teams = (data?.teams ?? []).filter((team: any) => `${team.name} ${team.username}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell title="Team Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Teams" title="Create, edit, hide, and clean up team accounts" text="Use hidden teams for testing without showing them to players." /><div className="grid-2"><Card><h3>{editId ? 'Edit Team' : 'Create Team'}</h3><FormGrid><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team name" /><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" /><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" /><input type="number" value={form.cash} onChange={(e) => setForm({ ...form, cash: Number(e.target.value) })} placeholder="Cash" /><label className="checkbox-row"><input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} /> Hidden test team</label></FormGrid><ActionRow><button onClick={save}>{editId ? 'Save team' : 'Add team'}</button><button className="secondary" onClick={() => { setEditId(''); setForm({ name: '', username: '', password: '', cash: 5000, hidden: false }); }}>Reset</button></ActionRow></Card><Card><h3>Teams</h3><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams" />{teams.length ? <DataTable columns={['name', 'username', 'cash', 'hidden', 'created_at']} rows={teams} /> : <p className="muted">No teams yet.</p>}</Card></div><div className="grid-2">{teams.map((team: any) => <Card key={team.id}><h3>{team.name}</h3><p className="muted">@{team.username} · {team.cash} Cashbux · {team.hidden ? 'Hidden' : 'Visible'}</p><ActionRow><button onClick={() => edit(team)}>Edit</button><button className="secondary" onClick={() => toggleHidden(team)}>{team.hidden ? 'Unhide' : 'Hide'}</button><button className="secondary" onClick={() => remove(team.id)}>Delete</button></ActionRow></Card>)}</div></AppShell>;
}

function CompanyManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ name: '', ticker: '', industry: '', description: '', revenue: 0, profit: 0, debt: 0, dividend_yield: 0, price: 1, sector: '', volume: 0, hq: '', founded: '', ceo: '', focus: '', scenario: '', news: '' });
  const [editId, setEditId] = useState('');
  const [query, setQuery] = useState('');
  const load = () => apiGet('/admin/companies', token).then(setData).catch(() => setData({ companies: [] }));
  useEffect(() => { load(); }, [token]);
  const save = async () => { await apiPost('/admin/company', { id: editId || undefined, ...form }, token); setEditId(''); load(); };
  const remove = async (id: string) => { await apiDelete(`/admin/company/${id}`, token); load(); };
  const edit = (company: any) => { setEditId(company.id); setForm({ name: company.name, ticker: company.ticker, industry: company.industry, description: company.description, revenue: company.revenue, profit: company.profit, debt: company.debt, dividend_yield: company.dividend_yield, price: company.price, sector: company.sector, volume: company.volume, hq: company.profile?.hq ?? '', founded: company.profile?.founded ?? '', ceo: company.profile?.ceo ?? '', focus: company.profile?.focus ?? '', scenario: company.profile?.scenario ?? '', news: company.profile?.news ?? '' }); };
  const companies = (data?.companies ?? []).filter((company: any) => `${company.name} ${company.ticker} ${company.sector}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell title="Company Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Companies" title="Keep pricing, financials, and metadata tidy" text="This panel handles company creation, updates, and fast cleanup when your event setup changes." /><div className="grid-2"><Card><h3>{editId ? 'Edit Company' : 'Create Company'}</h3><FormGrid><Field label="Company name" hint="The full display name shown to players."><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aurora Chips" /></Field><Field label="Ticker" hint="Short stock symbol, usually 2 to 5 uppercase letters."><input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="e.g. AUR" /></Field><Field label="Industry" hint="General business category, like Technology or Finance."><input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Technology" /></Field><Field label="Sector" hint="Market grouping used for filtering and events."><input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="e.g. Tech" /></Field><Field label="Description" hint="A short plain-language summary of what the company does."><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the company" /></Field><Field label="Headquarters" hint="City and country or region where the company is based."><input value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} placeholder="e.g. Austin, Texas" /></Field><Field label="Founded" hint="Use a year like 2018, or a short founding date if you prefer."><input value={form.founded} onChange={(e) => setForm({ ...form, founded: e.target.value })} placeholder="e.g. 2018" /></Field><Field label="CEO" hint="Current chief executive or the person running the company."><input value={form.ceo} onChange={(e) => setForm({ ...form, ceo: e.target.value })} placeholder="e.g. Maya Chen" /></Field><Field label="Business focus" hint="What the company mainly does in plain language."><textarea value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} placeholder="Describe the company's focus" /></Field><Field label="Risk scenario" hint="The main downside case players should understand."><textarea value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} placeholder="Describe the downside risk" /></Field><Field label="News blurb" hint="A short live-sounding update that appears in the company info card."><textarea value={form.news} onChange={(e) => setForm({ ...form, news: e.target.value })} placeholder="Write a short update" /></Field><div className="grid-2"><Field label="Price" hint="Starting share price in Cashbux. Use whole numbers."><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="e.g. 100" /></Field><Field label="Volume" hint="Trading volume shown in the market list. Use whole numbers."><input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} placeholder="e.g. 0" /></Field><Field label="Revenue" hint="Company revenue for display and scoring. Use whole numbers."><input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })} placeholder="e.g. 5000" /></Field><Field label="Profit" hint="Company profit for display and scoring. Use whole numbers."><input type="number" value={form.profit} onChange={(e) => setForm({ ...form, profit: Number(e.target.value) })} placeholder="e.g. 1200" /></Field><Field label="Debt" hint="Company debt for display and scoring. Use whole numbers."><input type="number" value={form.debt} onChange={(e) => setForm({ ...form, debt: Number(e.target.value) })} placeholder="e.g. 300" /></Field><Field label="Dividend yield" hint="Annual dividend yield as a percentage, like 1.5 or 3."><input type="number" value={form.dividend_yield} onChange={(e) => setForm({ ...form, dividend_yield: Number(e.target.value) })} placeholder="e.g. 2.5" /></Field></div></FormGrid><ActionRow><button onClick={save}>{editId ? 'Save company' : 'Add company'}</button><button className="secondary" onClick={() => { setEditId(''); setForm({ name: '', ticker: '', industry: '', description: '', revenue: 0, profit: 0, debt: 0, dividend_yield: 0, price: 1, sector: '', volume: 0, hq: '', founded: '', ceo: '', focus: '', scenario: '', news: '' }); }}>Reset</button></ActionRow></Card><Card><h3>Companies</h3><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" />{companies.length ? <DataTable columns={['ticker', 'name', 'industry', 'price', 'volume', 'sector']} rows={companies} /> : <p className="muted">No companies yet.</p>}</Card></div><div className="grid-2">{companies.map((company: any) => <Card key={company.id}><h3>{company.name}</h3><p className="muted">{company.ticker} · {company.sector}</p><ActionRow><button onClick={() => edit(company)}>Edit</button><button className="secondary" onClick={() => remove(company.id)}>Delete</button></ActionRow></Card>)}</div></AppShell>;
}

function MarketControlsPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [settings, setSettings] = useState({ inflation: 0, interestRate: 0, eventMode: false });
  const [eventForm, setEventForm] = useState({ name: '', targetType: 'market', targetValue: '', effectPct: 0 });
  const refresh = async () => {
    const next = await apiGet<any>('/admin/overview', token).catch(() => EMPTY_ADMIN_OVERVIEW);
    setData(next);
    setSettings({ inflation: next.market.inflation ?? 0, interestRate: next.market.interest_rate ?? 0, eventMode: Boolean(next.market.event_mode) });
  };
  useEffect(() => { void refresh(); }, [token]);
  useEffect(() => { apiGet<{ companies: Company[] }>('/market', token).then((payload) => setCompanies(payload.companies)).catch(() => setCompanies([])); }, [token]);
  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(apiBase.replace(/\/api$/, ''));
    socket.on('market-status-updated', () => { void refresh(); });
    socket.on('stock-prices-updated', () => { void refresh(); });
    return () => { socket.close(); };
  }, [token]);
  const statusAction = (path: string) => async () => { await apiPost(path, {}, token); await refresh(); };
  const saveSettings = async () => { await apiPost('/admin/market/settings', settings, token); setData(await apiGet('/admin/overview', token).catch(() => EMPTY_ADMIN_OVERVIEW)); };
  const triggerEvent = async () => { await apiPost('/admin/trigger-event', eventForm, token); setData(await apiGet('/admin/overview', token).catch(() => EMPTY_ADMIN_OVERVIEW)); };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  const sectors = Array.from(new Set(companies.map((company: any) => company.sector))).sort();
  return <AppShell title="Market Controls" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Market" title="Open, pause, and shock the market from the browser" text="Use this page to keep the event moving without dropping into the database or terminal." /><div className="grid-2"><Card><h3>Market Status</h3><div className="stack"><div className="status-line"><span>Status</span><strong>{data.market.status}</strong></div><div className="status-line"><span>Inflation</span><strong>{data.market.inflation}</strong></div><div className="status-line"><span>Interest</span><strong>{data.market.interest_rate}</strong></div><div className="status-line"><span>Event Mode</span><strong>{data.market.event_mode ? 'On' : 'Off'}</strong></div><ActionRow><button onClick={statusAction('/admin/open-market')}>Open</button><button onClick={statusAction('/admin/close-market')}>Close</button><button onClick={statusAction('/admin/pause-market')}>Pause</button><button onClick={statusAction('/admin/freeze-market')} className="secondary">Freeze</button></ActionRow></div></Card><Card><h3>Settings</h3><FormGrid><Field label="Inflation rate" hint="Enter a percentage value, like 2 or -1.5. Positive numbers raise prices; negative numbers lower them."><input type="number" value={settings.inflation} onChange={(e) => setSettings({ ...settings, inflation: Number(e.target.value) })} placeholder="e.g. 2" /></Field><Field label="Interest rate" hint="Enter a percentage value, like 3 or 0.5. This affects how money-related rules behave in the sim."><input type="number" value={settings.interestRate} onChange={(e) => setSettings({ ...settings, interestRate: Number(e.target.value) })} placeholder="e.g. 3" /></Field><label className="checkbox-row"><input type="checkbox" checked={settings.eventMode} onChange={(e) => setSettings({ ...settings, eventMode: e.target.checked })} /> Event mode</label></FormGrid><button onClick={saveSettings}>Save settings</button></Card></div><Card><h3>Trigger Event</h3><div className="stack"><div className="toolbar"><Field label="Event name" hint="A short title for the event, like 'Supply Shock' or 'Fed Hike'."><input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Type a name" /></Field><Field label="Target type" hint="Choose what the event should affect."><select value={eventForm.targetType} onChange={(e) => setEventForm({ ...eventForm, targetType: e.target.value })}><option value="market">Market</option><option value="sector">Sector</option><option value="company">Company</option></select></Field><Field label="Target value" hint="Pick a sector or company from the dropdown. Market events do not need a target."><select value={eventForm.targetValue} onChange={(e) => setEventForm({ ...eventForm, targetValue: e.target.value })}><option value="">Select a target</option>{eventForm.targetType === 'sector' ? sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>) : null}{eventForm.targetType === 'company' ? companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.ticker})</option>) : null}</select></Field><Field label="Effect %" hint="Use a percentage like 5 or -10. Positive boosts values; negative drops them."><input type="number" value={eventForm.effectPct} onChange={(e) => setEventForm({ ...eventForm, effectPct: Number(e.target.value) })} placeholder="e.g. -8" /></Field></div><button onClick={triggerEvent}>Trigger</button></div></Card><Card><h3>Market Data</h3>{data.market ? <div className="stack"><div className="status-line"><span>Status</span><strong>{data.market.status}</strong></div><div className="status-line"><span>Inflation</span><strong>{data.market.inflation}</strong></div><div className="status-line"><span>Interest</span><strong>{data.market.interest_rate}</strong></div><div className="status-line"><span>Updated</span><strong>{data.market.updated_at}</strong></div></div> : <p className="muted">No market data yet.</p>}</Card></AppShell>;
}

function NewsManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [market, setMarket] = useState<{ companies: Company[] } | null>(null);
  const [form, setForm] = useState<any>({ title: '', body: '', category: 'Market News', impact_type: 'market', published: true, companyIds: [] as string[] });
  const [editId, setEditId] = useState('');
  useEffect(() => { apiGet('/admin/news', token).then(setData).catch(() => setData({ articles: [] })); }, [token]);
  useEffect(() => { apiGet<{ companies: Company[] }>('/admin/companies', token).then(setMarket).catch(() => setMarket({ companies: [] })); }, [token]);
  const save = async () => { await apiPost('/admin/news', { ...form, id: editId || undefined }, token); setEditId(''); setForm({ title: '', body: '', category: 'Market News', impact_type: 'market', published: true, companyIds: [] }); setData(await apiGet('/admin/news', token).catch(() => ({ articles: [] }))); };
  const remove = async (id: string) => { await apiDelete(`/admin/news/${id}`, token); setData(await apiGet('/admin/news', token).catch(() => ({ articles: [] }))); };
  const edit = (article: Article) => { setEditId(article.id); setForm({ title: article.title, body: article.body, category: article.category, impact_type: article.impact_type, published: Boolean((article as any).published), companyIds: [] }); };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="News Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="News" title="Publish market stories without leaving the dashboard" text="Create, edit, and target articles so the feed feels alive for every team." /><Card><h3>{editId ? 'Edit News Article' : 'Create News Article'}</h3><div className="stack"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" /><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Body" /><div className="toolbar"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>General News</option><option>Market News</option><option>Insider News</option></select><select value={form.impact_type} onChange={(e) => setForm({ ...form, impact_type: e.target.value })}><option value="market">Market</option><option value="sector">Sector</option><option value="company">Company</option><option value="none">None</option></select><label className="checkbox-row"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish now</label></div><div className="stack"><div className="muted tiny">Target companies</div><select multiple value={form.companyIds} onChange={(e) => setForm({ ...form, companyIds: Array.from(e.currentTarget.selectedOptions).map((option) => option.value) })}>{(market?.companies ?? []).map((company) => <option key={company.id} value={company.id}>{company.name} ({company.ticker})</option>)}</select></div><ActionRow><button onClick={save}>{editId ? 'Save article' : 'Publish article'}</button><button className="secondary" onClick={() => { setEditId(''); setForm({ title: '', body: '', category: 'Market News', impact_type: 'market', published: true, companyIds: [] }); }}>Reset</button></ActionRow></div></Card>{data.articles.length ? <div className="grid-2">{data.articles.map((article: Article) => <Card key={article.id}><h3>{article.title}</h3><p className="muted">{article.category} · {article.impact_type}</p><p>{article.body}</p><ActionRow><button onClick={() => edit(article)}>Edit</button><button className="secondary" onClick={() => remove(article.id)}>Delete</button></ActionRow></Card>)}</div> : <EmptyState title="No news yet" text="Create a news article to start the feed." />}</AppShell>;
}

function NotificationManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState({ teamId: '', title: '', body: '', priority: 1, pinned: false });
  useEffect(() => { apiGet('/admin/notifications', token).then(setData).catch(() => setData({ notifications: [] })); }, [token]);
  useEffect(() => { apiGet('/admin/teams', token).then((value: any) => setTeams(value.teams ?? [])).catch(() => setTeams([])); }, [token]);
  const send = async () => { await apiPost('/admin/notifications', { ...form, teamId: form.teamId || undefined }, token); setData(await apiGet('/admin/notifications', token).catch(() => ({ notifications: [] }))); };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Notification Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Notifications" title="Push announcements to everyone or one team" text="Keep teams aligned with quick notices, pinned announcements, and priority flags." /><Card><h3>Send Announcement</h3><div className="stack"><select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}><option value="">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" /><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" /><div className="toolbar"><input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} placeholder="Priority" /><label className="checkbox-row"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pinned</label><button onClick={send}>Send</button></div></div></Card>{data.notifications.length ? <div className="grid-2">{data.notifications.map((note: Notification) => <Card key={note.id}><strong>{note.title}</strong><p>{note.body}</p><p className="muted tiny">Priority {note.priority}</p></Card>)}</div> : <EmptyState title="No notifications yet" text="Send an announcement to show it here." />}</AppShell>;
}

function SnapshotManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [label, setLabel] = useState('');
  useEffect(() => { apiGet('/admin/snapshots', token).then(setData).catch(() => setData({ snapshots: [] })); }, [token]);
  const create = async () => { await apiPost('/admin/snapshot', { label }, token); setData(await apiGet('/admin/snapshots', token).catch(() => ({ snapshots: [] }))); };
  const restore = async (id: string) => { await apiPost(`/admin/snapshots/${id}/restore`, {}, token); setData(await apiGet('/admin/snapshots', token).catch(() => ({ snapshots: [] }))); };
  const remove = async (id: string) => { await apiDelete(`/admin/snapshots/${id}`, token); setData(await apiGet('/admin/snapshots', token).catch(() => ({ snapshots: [] }))); };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Snapshot Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Snapshots" title="Capture and roll back the market state" text="Use snapshots before major changes so you can restore the game quickly if something goes sideways." /><Card><h3>Create Snapshot</h3><div className="toolbar"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Snapshot label" /><button onClick={create}>Create</button></div></Card>{data.snapshots.length ? <div className="grid-2">{data.snapshots.map((snapshot: any) => <Card key={snapshot.id}><h3>{snapshot.label}</h3><p className="muted">{snapshot.created_at}</p><ActionRow><button onClick={() => restore(snapshot.id)}>Restore</button><button className="secondary" onClick={() => remove(snapshot.id)}>Delete</button></ActionRow></Card>)}</div> : <EmptyState title="No snapshots yet" text="Create one before you make major changes." />}</AppShell>;
}

function EventLogsPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('All');
  useEffect(() => { apiGet('/admin/logs', token).then(setData).catch(() => setData({ logs: [] })); }, [token]);
  const logs: Array<Record<string, any>> = data?.logs ?? [];
  const kinds: string[] = Array.from(new Set(logs.map((log: any) => logKind(String(log.action))))).sort();
  const visibleLogs: Array<Record<string, any>> = useMemo(() => {
    return logs.filter((log: any) => {
      const action = String(log.action ?? '');
      const details = String(log.details ?? '');
      const matchesKind = kind === 'All' || logKind(action) === kind;
      const matchesQuery = !query || `${log.created_at} ${action} ${details}`.toLowerCase().includes(query.toLowerCase());
      return matchesKind && matchesQuery;
    });
  }, [logs, kind, query]);
  const summary = {
    total: logs.length,
    snapshots: logs.filter((log: any) => String(log.action).includes('snapshot')).length,
    teams: logs.filter((log: any) => String(log.action).includes('team')).length,
    market: logs.filter((log: any) => String(log.action).includes('market')).length,
    backups: logs.filter((log: any) => String(log.action).includes('backup')).length
  };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return (
    <AppShell title="Event Logs" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected">
      <PageIntro eyebrow="Activity" title="Recent game-master actions at a glance" text="Filter the event stream to quickly find snapshots, team changes, market actions, and backups." />
      <StatGrid items={[
        { label: 'Total Logs', value: summary.total },
        { label: 'Snapshots', value: summary.snapshots },
        { label: 'Team Actions', value: summary.teams },
        { label: 'Market Actions', value: summary.market },
        { label: 'Backups', value: summary.backups }
      ]} />
      <Card>
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search log text" />
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="All">All types</option>
            {kinds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {visibleLogs.length ? (
          <div className="log-grid">
            {visibleLogs.map((log: any) => {
              const details = parseMaybeJson(log.details);
              const entries = Object.entries(details as Record<string, unknown>) as Array<[string, unknown]>;
              return (
                <Card key={`${log.created_at}-${log.action}`} className="log-card">
                  <div className="log-head">
                    <div>
                      <div className="log-time">{log.created_at}</div>
                      <h3>{formatActionLabel(String(log.action))}</h3>
                    </div>
                    <span className="pill">{logKind(String(log.action))}</span>
                  </div>
                  <div className="log-body">
                    {details && typeof details === 'object' ? (
                      <div className="log-details">
                        {entries.map(([fieldKey, fieldValue]) => (
                          <div key={fieldKey} className="status-line">
                            <span>{formatActionLabel(fieldKey)}</span>
                            <strong>{renderCell(fieldValue)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">{renderCell(details)}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No event logs match" text="Try a different filter or search term." />
        )}
      </Card>
    </AppShell>
  );
}

function NetworkPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet('/admin/network', token).then(setData).catch(() => setData({ serverIp: 'Not available', connectedUsers: 0, connectedTeams: 0, dbHealth: false, lastBackupTime: null, marketStatus: { status: 'No market data yet' } })); }, [token]);
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Network Diagnostics" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><Card><div className="stack"><div className="status-line"><span>Server IP</span><strong>{data.serverIp}</strong></div><div className="status-line"><span>Connected Devices</span><strong>{data.connectedUsers}</strong></div><div className="status-line"><span>Connected Teams</span><strong>{data.connectedTeams.count ?? data.connectedTeams}</strong></div><div className="status-line"><span>Database Health</span><strong>{data.dbHealth ? 'Healthy' : 'Problem'}</strong></div><div className="status-line"><span>Last Backup</span><strong>{data.lastBackupTime?.created_at ?? 'None'}</strong></div><div className="status-line"><span>Market Status</span><strong>{data.marketStatus?.status ?? 'Unknown'}</strong></div></div>{Array.isArray(data.devices) && data.devices.length ? <div className="stack"><h3>Active Devices</h3>{data.devices.map((device: any) => <div key={`${device.role}-${device.user_id}`} className="status-line"><span>{device.role === 'admin' ? 'Admin' : 'Team'} {device.user_id}</span><strong>{device.last_seen}</strong></div>)}</div> : <p className="muted">No active devices detected in the last 2 minutes.</p>}</Card></AppShell>;
}

function BackupManagementPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => apiGet('/admin/backups', token).then(setData).catch(() => setData({ backups: [] }));
  useEffect(() => { refresh(); }, [token]);
  const create = async () => { await apiPost('/admin/backup', {}, token); refresh(); };
  const download = async (fileName: string) => {
    const res = await fetch(`${apiBase}/admin/backups/${encodeURIComponent(fileName)}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const restore = async (fileName: string) => {
    await apiPost(`/admin/backups/${encodeURIComponent(fileName)}/restore`, {}, token);
    await refresh();
  };
  if (!data) return <div className="main"><Card>Loading...</Card></div>;
  return <AppShell title="Backup Management" token={token} role="admin" logout={() => localStorage.clear()} connectionStatus="connected"><PageIntro eyebrow="Backups" title="Create and audit backups from the web UI" text="The server still writes files on disk, but the browser now gives you a proper control surface for it." /><Card><div className="toolbar"><button onClick={create}>Create Backup</button></div></Card>{data.backups.length ? <div className="grid-2">{data.backups.map((backup: any) => <Card key={`${backup.created_at}-${backup.file_name}`}><h3>{backup.file_name}</h3><p className="muted">{backup.created_at}</p><p className="tiny">{backup.kind}</p><ActionRow><button onClick={() => download(backup.file_name)}>Download</button>{backup.kind === 'snapshot' ? <button className="secondary" onClick={() => restore(backup.file_name)}>Restore</button> : null}</ActionRow></Card>)}</div> : <EmptyState title="No backups yet" text="Create a backup before running the event, then restore it if needed." />}</AppShell>;
}

function FirstRunWizard({ token, done }: { token: string; done: () => void }) {
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [startingCash, setStartingCash] = useState(5000);
  const [eventMode, setEventMode] = useState(true);
  const [status, setStatus] = useState('');
  async function create() {
    const teams = Array.from({ length: 7 }, (_, index) => ({ name: `Team ${index + 1}`, username: `team${index + 1}`, password: `team${index + 1}123` }));
    const companies = [
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
    await apiPost('/admin/setup', { adminUsername, adminPassword, startingCash, teams, companies, eventMode }, token);
    setStatus('Setup completed');
    done();
  }
  return <div className="auth-shell"><Card className="auth-card"><h2>First-Run Wizard</h2><p className="muted">Set up your event once, then jump straight into the dashboard.</p><div className="stack"><input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="Admin username" /><input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" type="password" /><input value={startingCash} type="number" onChange={(e) => setStartingCash(Number(e.target.value))} /><label className="checkbox-row"><input type="checkbox" checked={eventMode} onChange={(e) => setEventMode(e.target.checked)} /> Event mode</label><button onClick={create}>Create event setup</button><p className="muted">{status}</p></div></Card></div>;
}




export default function AppRoutes() {
  const auth = useAuth();
  const [firstRun, setFirstRun] = useState(false);
  useEffect(() => { apiGet('/health').then((data: any) => setFirstRun(Boolean(data.firstRun))); }, []);
  if (!auth.token) return <Routes><Route path="*" element={<LoginPage login={auth.login} />} /></Routes>;
  if (firstRun) return <FirstRunWizard token={auth.token} done={() => setFirstRun(false)} />;
  const adminRedirect = <Navigate to="/team/dashboard" replace />;
  const adminOnly = (element: React.ReactNode) => (auth.role === 'admin' ? element : adminRedirect);
  return <Routes><Route path="/" element={<Navigate to={auth.role === 'admin' ? '/admin' : '/team/dashboard'} replace />} /><Route path="/status" element={<StatusPage token={auth.token} role={auth.role} />} /><Route path="/team/dashboard" element={<TeamDashboard token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/market" element={<MarketPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/company" element={<CompanyDetailsPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/portfolio" element={<PortfolioPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/history" element={<HistoryPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/news" element={<NewsPage token={auth.token} role={auth.role} />} /><Route path="/team/leaderboard" element={<LeaderboardPage token={auth.token} role={auth.role} />} /><Route path="/team/notifications" element={<NotificationsPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/team/watchlist" element={<WatchlistPage token={auth.token} userId={auth.userId} role={auth.role} />} /><Route path="/admin" element={adminOnly(<AdminPage token={auth.token} userId={auth.userId} />)} /><Route path="/admin/company" element={adminOnly(<CompanyDetailsPage token={auth.token} userId={auth.userId} role="admin" />)} /><Route path="/admin/teams" element={adminOnly(<TeamManagementPage token={auth.token} />)} /><Route path="/admin/companies" element={adminOnly(<CompanyManagementPage token={auth.token} />)} /><Route path="/admin/market" element={adminOnly(<MarketControlsPage token={auth.token} />)} /><Route path="/admin/news" element={adminOnly(<NewsManagementPage token={auth.token} />)} /><Route path="/admin/notifications" element={adminOnly(<NotificationManagementPage token={auth.token} />)} /><Route path="/admin/snapshots" element={adminOnly(<SnapshotManagementPage token={auth.token} />)} /><Route path="/admin/events" element={adminOnly(<EventLogsPage token={auth.token} />)} /><Route path="/admin/network" element={adminOnly(<NetworkPage token={auth.token} />)} /><Route path="/admin/backups" element={adminOnly(<BackupManagementPage token={auth.token} />)} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}

