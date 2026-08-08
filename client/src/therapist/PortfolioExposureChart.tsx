import type { TherapistResponse } from './types';

export function PortfolioExposureChart({ exposure }: { exposure: TherapistResponse['exposure'] }) {
  if (!exposure || !exposure.holdings.length) {
    return <p className="muted tiny">No current holdings to chart.</p>;
  }
  return (
    <div className="pt-exposure">
      <small>BY HOLDING</small>
      {exposure.holdings.map((h) => (
        <div className="pt-exposure-row" key={h.ticker}>
          <span className="pt-exposure-label">{h.ticker}</span>
          <span className="score-track"><i style={{ width: `${Math.round(h.weight * 100)}%` }} /></span>
          <span className="pt-exposure-value">{Math.round(h.weight * 100)}%</span>
        </div>
      ))}
      <small>BY SECTOR</small>
      {exposure.sectors.map((s) => (
        <div className="pt-exposure-row" key={s.sector}>
          <span className="pt-exposure-label">{s.sector}</span>
          <span className="score-track"><i style={{ width: `${Math.round(s.weight * 100)}%` }} /></span>
          <span className="pt-exposure-value">{Math.round(s.weight * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
