import type { DetectorId, MentalState } from './types.js';

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function bandForScore(score: number): MentalState {
  if (score <= 20) return 'ZEN_INVESTOR';
  if (score <= 40) return 'MILDLY_QUESTIONABLE';
  if (score <= 60) return 'CONCERNED';
  if (score <= 80) return 'DENIAL';
  return 'EMOTIONAL_DAMAGE';
}

export function averageAvailable(scores: Partial<Record<DetectorId, number | null>>): {
  score: number | null;
  detectorsIncluded: DetectorId[];
} {
  const entries = Object.entries(scores) as [DetectorId, number | null][];
  const available = entries.filter((entry): entry is [DetectorId, number] => entry[1] !== null);
  if (!available.length) return { score: null, detectorsIncluded: [] };
  const sum = available.reduce((total, [, value]) => total + value, 0);
  return {
    score: Math.round((sum / available.length) * 10) / 10,
    detectorsIncluded: available.map(([id]) => id)
  };
}
