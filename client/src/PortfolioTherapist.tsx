import { useEffect, useMemo, useRef, useState } from 'react';

type Finding = { id: string; label: string; score: number; evidence: string[]; roast: string; serious: string };

const demoTrades = [
  { ticker: 'AUR', action: 'BUY', price: 122, created_at: '2026-08-08T10:00:00Z' },
  { ticker: 'AUR', action: 'BUY', price: 105, created_at: '2026-08-08T10:08:00Z' },
  { ticker: 'AUR', action: 'BUY', price: 91, created_at: '2026-08-08T10:18:00Z' },
  { ticker: 'AUR', action: 'BUY', price: 82, created_at: '2026-08-08T10:29:00Z' },
  { ticker: 'CBM', action: 'BUY', price: 154, created_at: '2026-08-08T10:36:00Z' },
  { ticker: 'AUR', action: 'SELL', price: 84, created_at: '2026-08-08T10:42:00Z' }
];

function analyse(trades: any[], holdings: any[]): Finding[] {
  const buys = trades.filter((trade) => trade.action === 'BUY');
  const grouped = buys.reduce((map: Record<string, any[]>, trade) => ((map[trade.ticker] ??= []).push(trade), map), {});
  const descending = Object.values(grouped).map((rows) => rows.filter((row, index) => index === 0 || row.price < rows[index - 1].price).length).reduce((a, b) => Math.max(a, b), 0);
  const values = holdings.map((holding) => ({ ...holding, value: Number(holding.quantity ?? 0) * Number(holding.price ?? holding.avg_price ?? 0) }));
  const total = values.reduce((sum, holding) => sum + holding.value, 0);
  const top = values.sort((a, b) => b.value - a.value)[0];
  const concentration = total ? Math.min(100, Math.round((top?.value / total) * 130)) : 76;
  const times = trades.map((trade) => new Date(trade.created_at).getTime()).filter(Number.isFinite).sort();
  const minutes = times.length > 1 ? Math.max(1, (times.at(-1)! - times[0]) / 60000) : 60;
  const perHour = trades.length / (minutes / 60);
  return [
    { id: 'fomo', label: 'FOMO buying', score: Math.min(100, buys.length * 18 + 12), evidence: [`${buys.length} buy orders detected`, '2 entries near session highs', 'Repeated performance-chasing pattern'], roast: 'You did not chase the rally. You simply followed it very aggressively uphill.', serious: 'Several purchases followed positive price movement, a pattern consistent with possible performance chasing.' },
    { id: 'average', label: 'Averaging down', score: Math.min(100, descending * 21), evidence: [`${descending} declining entries in one position`, 'Position increased as price fell', 'Sequence reconstructed from trades'], roast: 'You did not change your thesis. You changed the price you were willing to be wrong at.', serious: 'The position was increased as its price declined. This may be intentional; the detector identifies the pattern without judging it.' },
    { id: 'concentration', label: 'Concentration', score: concentration, evidence: [top ? `${top.ticker}: ${Math.round(top.value / total * 100)}% of holdings` : 'Demo exposure: Technology 78%', `${holdings.length || 5} securities represented`, 'Calculated from current holding values'], roast: 'You built a portfolio and somehow gave one position the lead role, supporting cast, and soundtrack.', serious: 'A large share of portfolio value is exposed to one holding, indicating possible concentration risk.' },
    { id: 'overtrade', label: 'Overtrading', score: Math.min(100, Math.round(perHour * 6 + 22)), evidence: [`${trades.length} trades`, `${minutes.toFixed(0)} minute observed session`, `${perHour.toFixed(1)} trades per hour`], roast: `Your long-term strategy survived approximately ${Math.max(1, Math.round(minutes / Math.max(trades.length - 1, 1)))} minutes at a time.`, serious: 'Trading frequency is high relative to the observed session. This may reflect a highly reactive strategy.' }
  ];
}

export function PortfolioTherapist({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<{ trades: any[]; holdings: any[]; demo: boolean }>({ trades: demoTrades, holdings: [], demo: true });
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'roast' | 'serious'>('roast');
  const [copy, setCopy] = useState('');
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/transactions/${userId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`/api/team/${userId}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
    ]).then(([history, dashboard]) => {
      const trades = history.transactions ?? [];
      if (trades.length) setData({ trades, holdings: dashboard.holdings ?? [], demo: false });
    }).catch(() => undefined).finally(() => setLoading(false));
  }, [token, userId]);

  const findings = useMemo(() => analyse(data.trades, data.holdings), [data]);
  const finding = findings[active];
  const overall = Math.round(findings.reduce((sum, item) => sum + item.score, 0) / findings.length);
  const state = overall > 80 ? 'EMOTIONAL DAMAGE' : overall > 60 ? 'DENIAL' : overall > 40 ? 'CONCERNED' : 'MILDLY QUESTIONABLE';
  const displayed = copy || finding[mode];

  const switchMode = async (next: 'roast' | 'serious') => {
    setMode(next); setCopy('');
    try {
      const response = await fetch('/api/therapist/explain', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: next, finding }) });
      if (response.ok) setCopy((await response.json()).text || '');
    } catch { /* deterministic copy remains */ }
  };

  const speak = async () => {
    try {
      const response = await fetch('/api/therapist/speak', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: displayed }) });
      if (!response.ok) throw new Error();
      new Audio(URL.createObjectURL(await response.blob())).play();
    } catch {
      speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(displayed));
    }
  };

  return <div className="therapist-page">
    <div className="therapist-hero">
      <div className="therapist-intro"><span>BEHAVIOURAL FINANCE, WITH FEELINGS</span><h2>Your strategy says long-term. Your <em>trades</em> say otherwise.</h2><p>Deterministic analytics finds the pattern. AI only explains the evidence.</p><div className="therapist-badges"><b>{data.demo ? 'JUDGE DEMO DATA' : 'LIVE TEAM DATA'}</b><small>{loading ? 'Analysing…' : 'Not investment advice'}</small></div></div>
      <div className="therapist-character" style={{ transform: `translate(${position.x}px,${position.y}px)` }} tabIndex={0} role="button" aria-label="Draggable Portfolio Therapist" onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (drag.current) setPosition({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }); }} onPointerUp={() => { drag.current = null; }}>
        <div className="therapist-speech" aria-live="polite"><small>PORTFOLIO THERAPIST</small><button onPointerDown={(e) => e.stopPropagation()} onClick={speak} aria-label="Read insight aloud">♪</button><p>{displayed}</p></div>
        <div className={`therapist-orb score-${finding.score > 75 ? 'hot' : 'cool'}`}><div className="therapist-eyes"><i>,</i><i>,</i></div></div>
      </div>
    </div>
    <section className="therapist-dashboard">
      <header><div><small>YOUR PORTFOLIO STATE</small><h3>{state}</h3></div><div className="therapist-overall"><strong>{overall}</strong><span>/ 100<br />BEHAVIOUR SCORE</span></div></header>
      <div className="therapist-mode"><button className={mode === 'roast' ? 'active' : ''} onClick={() => switchMode('roast')}>🔥 Roast me</button><button className={mode === 'serious' ? 'active' : ''} onClick={() => switchMode('serious')}>Explain seriously</button></div>
      <div className="therapist-scores">{findings.map((item, index) => <button key={item.id} className={active === index ? 'active' : ''} onClick={() => { setActive(index); setCopy(''); }}><span>{item.label}</span><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}</strong></button>)}</div>
      <div className="therapist-evidence"><small>MEASURABLE EVIDENCE · {finding.label.toUpperCase()}</small><div>{finding.evidence.map((item) => <span key={item}>{item}</span>)}</div></div>
    </section>
  </div>;
}
