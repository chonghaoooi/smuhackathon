import { db } from '../db.js';
import { detectFomo } from './detectors/fomo.js';
import { detectAveragingDown } from './detectors/averagingDown.js';
import { detectConcentration } from './detectors/concentration.js';
import { detectOvertrading } from './detectors/overtrading.js';
import { averageAvailable, bandForScore } from './scoring.js';
import type { EngineResult } from './types.js';

export function analyzeTeam(teamId: string): EngineResult {
  const fomo = detectFomo(teamId);
  const averagingDown = detectAveragingDown(teamId);
  const concentration = detectConcentration(teamId);
  const overtrading = detectOvertrading(teamId);

  const scores = {
    fomo: fomo.score,
    averagingDown: averagingDown.score,
    concentration: concentration.score,
    overtrading: overtrading.score
  };

  const status = {
    fomo: fomo.status,
    averagingDown: averagingDown.status,
    concentration: concentration.status,
    overtrading: overtrading.status
  };

  const { score: overallScore, detectorsIncluded } = averageAvailable(scores);

  const transactionCount = (
    db.prepare('SELECT COUNT(*) AS count FROM transactions WHERE team_id = ?').get(teamId) as { count: number }
  ).count;

  return {
    scores,
    status,
    overall: {
      score: overallScore,
      state: overallScore === null ? null : bandForScore(overallScore),
      detectorsIncluded
    },
    findings: [...fomo.findings, ...averagingDown.findings, ...concentration.findings, ...overtrading.findings],
    exposure: concentration.exposure,
    meta: {
      teamId,
      generatedAt: new Date().toISOString(),
      transactionCount
    }
  };
}
