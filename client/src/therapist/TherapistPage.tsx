import { useEffect, useMemo, useState } from 'react';
import { AppShell, Card, apiGet } from '../App';
import { Character } from './Character';
import { ScoreRow } from './ScoreRow';
import { FindingDetail } from './FindingDetail';
import { ModeToggle } from './ModeToggle';
import { PortfolioExposureChart } from './PortfolioExposureChart';
import { MENTAL_STATE_LABELS, type DetectorId, type TherapistResponse } from './types';

const DETECTOR_ORDER: DetectorId[] = ['fomo', 'averagingDown', 'concentration', 'overtrading'];

export function TherapistPage({ token, role }: { token: string; userId: string; role: string }) {
  const [data, setData] = useState<TherapistResponse | null>(null);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<'roast' | 'serious'>('roast');
  const [activeId, setActiveId] = useState<DetectorId>('fomo');

  useEffect(() => {
    apiGet<TherapistResponse>('/therapist/me', token)
      .then((response) => {
        setData(response);
        const firstWithFindings = DETECTOR_ORDER.find((id) => response.findings.some((f) => f.detector === id));
        setActiveId(firstWithFindings ?? 'fomo');
      })
      .catch(() => setError(true));
  }, [token]);

  const findingsByDetector = useMemo(() => {
    const map = new Map<DetectorId, TherapistResponse['findings']>();
    if (data) {
      for (const finding of data.findings) {
        const list = map.get(finding.detector) ?? [];
        list.push(finding);
        map.set(finding.detector, list);
      }
    }
    return map;
  }, [data]);

  if (error) {
    return (
      <AppShell title="Portfolio Therapist" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected">
        <Card><p className="muted">Could not load your behavioural analysis. Try trading a bit first, then come back.</p></Card>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Portfolio Therapist" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected">
        <Card>Loading...</Card>
      </AppShell>
    );
  }

  const speechText = data.narrative[mode] || "Not enough trading history to say anything interesting yet.";

  return (
    <AppShell title="Portfolio Therapist" token={token} role={role} logout={() => localStorage.clear()} connectionStatus="connected">
      <div className="therapist-shell">
        <div className="pt-intro">
          <span className="kicker">BEHAVIOURAL FINANCE, WITH FEELINGS</span>
          <p>Analytics determines the facts. Roast Mode and Serious Mode just decide how they're said out loud.</p>
        </div>

        <Character score={data.overall.score} speechText={speechText} />

        <section className="analysis-panel" aria-labelledby="pt-analysis-title">
          <div className="analysis-heading">
            <div>
              <span className="section-label">YOUR PORTFOLIO STATE</span>
              <h2 id="pt-analysis-title">{data.overall.state ? MENTAL_STATE_LABELS[data.overall.state] : 'Not Enough Data Yet'}</h2>
            </div>
            <div className="overall-score">
              <strong>{data.overall.score ?? '—'}</strong>
              <span>/ 100<br />BEHAVIOUR SCORE</span>
            </div>
          </div>

          <ModeToggle mode={mode} onChange={setMode} />
          {!data.narrative.available ? (
            <p className="muted tiny">Narrative generated from findings only (AI text unavailable).</p>
          ) : null}

          <div className="score-list">
            {DETECTOR_ORDER.map((id) => (
              <ScoreRow key={id} id={id} score={data.scores[id]} selected={activeId === id} onSelect={() => setActiveId(id)} />
            ))}
          </div>

          <FindingDetail
            key={activeId}
            id={activeId}
            score={data.scores[activeId]}
            insufficientData={data.status[activeId].state === 'insufficient_data'}
            findings={findingsByDetector.get(activeId) ?? []}
          />

          <PortfolioExposureChart exposure={data.exposure} />
        </section>
      </div>
    </AppShell>
  );
}
