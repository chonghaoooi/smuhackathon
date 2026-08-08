import { useState } from 'react';
import { DETECTOR_BREAKDOWN, DETECTOR_LABELS, DETECTOR_TONE, type DetectorId, type Finding } from './types';

const PERCENT_KEYS = ['weight', 'return', 'position', 'pct', 'turnover', 'decline'];

function formatEvidenceValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(' → ');
  if (typeof value === 'number') {
    const lowerKey = key.toLowerCase();
    if (PERCENT_KEYS.some((k) => lowerKey.includes(k)) && Math.abs(value) <= 5) {
      return `${Math.round(value * 100)}%`;
    }
    return String(value);
  }
  return String(value);
}

function summaryFor(id: DetectorId, findings: Finding[]): string {
  if (!findings.length) {
    return {
      fomo: 'No purchases have matched the FOMO pattern yet.',
      averagingDown: 'No declining purchase sequence detected yet.',
      concentration: 'No outsized concentration detected yet.',
      overtrading: 'Trading pace looks steady so far.'
    }[id];
  }
  const finding = findings[0];
  const evidence = finding.evidence;
  switch (id) {
    case 'fomo':
      return `${findings.length} purchase${findings.length === 1 ? '' : 's'} followed a rally near the recent high.`;
    case 'averagingDown':
      return `${evidence.longestStreak ?? evidence.stepDowns} consecutive purchases were made as the price declined.`;
    case 'concentration': {
      const weight = typeof evidence.weight === 'number' ? Math.round(evidence.weight * 100) : null;
      const label = finding.ticker ?? String(evidence.sector ?? 'one area');
      return weight !== null ? `${weight}% of portfolio value sits in ${label}.` : 'Portfolio value is concentrated in a small number of positions.';
    }
    case 'overtrading':
      return `${evidence.totalTrades} trades across ${evidence.sessionMinutes} minutes (${evidence.tradesPerHour}/hour).`;
    default:
      return '';
  }
}

export function FindingDetail({
  id,
  score,
  insufficientData,
  findings
}: {
  id: DetectorId;
  score: number | null;
  insufficientData: boolean;
  findings: Finding[];
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const finding = findings[0];
  const evidenceEntries = finding ? Object.entries(finding.evidence).slice(0, 3) : [];
  const evidenceTags = ['TRIGGER', 'MEASURED', 'CONTEXT'];

  return (
    <article className="finding-card">
      <div className="finding-title">
        <span className={`score-dot ${DETECTOR_TONE[id]}`} />
        <div>
          <small>DETECTED PATTERN</small>
          <h3>{DETECTOR_LABELS[id]}</h3>
        </div>
        <strong>{score === null ? '—' : score}</strong>
      </div>
      <p>
        {insufficientData ? 'Not enough trading history to evaluate this behaviour yet.' : summaryFor(id, findings)}
      </p>
      {!insufficientData ? (
        <button className="evidence-toggle" type="button" onClick={() => setEvidenceOpen((open) => !open)} aria-expanded={evidenceOpen}>
          {evidenceOpen ? 'Hide evidence' : 'Show evidence'}<span>{evidenceOpen ? '−' : '+'}</span>
        </button>
      ) : null}
      {evidenceOpen && !insufficientData ? (
        <div className="evidence-grid">
          {evidenceEntries.length ? (
            evidenceEntries.map(([key, value], index) => (
              <div key={key}>
                <small>{evidenceTags[index] ?? 'DETAIL'}</small>
                <span>{key}: {formatEvidenceValue(key, value)}</span>
              </div>
            ))
          ) : (
            <div><small>DETAIL</small><span>No qualifying transactions detected</span></div>
          )}
          <div className="formula"><small>SCORE BREAKDOWN</small><span>{DETECTOR_BREAKDOWN[id]}</span></div>
        </div>
      ) : null}
    </article>
  );
}
