import { DETECTOR_LABELS, DETECTOR_TONE, type DetectorId } from './types';

export function ScoreRow({
  id,
  score,
  selected,
  onSelect
}: {
  id: DetectorId;
  score: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`score-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className={`score-dot ${DETECTOR_TONE[id]}`} />
      <span className="score-name">{DETECTOR_LABELS[id]}</span>
      <span className="score-track"><i style={{ width: `${score ?? 0}%` }} /></span>
      <strong>{score === null ? '—' : score}</strong>
    </button>
  );
}
