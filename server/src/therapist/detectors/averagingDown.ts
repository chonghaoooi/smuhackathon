import { db } from '../../db.js';
import { id as newId } from '../../utils.js';
import { clampScore } from '../scoring.js';
import type { DetectorResult, Evidence } from '../types.js';

const MIN_BUYS_PER_COMPANY = 3;
const STEP_DOWN_PTS = 12;
const STREAK_BONUS_PTS = 10;
const STREAK_MIN = 3;
const DEPTH_BONUS_PTS = 15;
const DEPTH_THRESHOLD = 0.25;
const MIN_STEP_DOWNS_FOR_FINDING = 2;

interface BuyRow {
  company_id: string;
  ticker: string;
  quantity: number;
  price: number;
  created_at: string;
}

export function detectAveragingDown(teamId: string): DetectorResult {
  const buys = db
    .prepare(
      `SELECT t.company_id, c.ticker, t.quantity, t.price, t.created_at
       FROM transactions t JOIN companies c ON c.id = t.company_id
       WHERE t.team_id = ? AND t.action = 'BUY'
       ORDER BY t.created_at ASC`
    )
    .all(teamId) as BuyRow[];

  const byCompany = new Map<string, BuyRow[]>();
  for (const buy of buys) {
    const list = byCompany.get(buy.company_id) ?? [];
    list.push(buy);
    byCompany.set(buy.company_id, list);
  }

  let maxBuysInAnyCompany = 0;
  let bestScore: number | null = null;
  const findings: DetectorResult['findings'] = [];

  for (const [, companyBuys] of byCompany) {
    maxBuysInAnyCompany = Math.max(maxBuysInAnyCompany, companyBuys.length);
    if (companyBuys.length < MIN_BUYS_PER_COMPANY) continue;

    const prices = companyBuys.map((b) => b.price);
    let stepDowns = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) {
        stepDowns += 1;
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    const totalDecline = (prices[0] - prices[prices.length - 1]) / prices[0];

    const companyScore = clampScore(
      stepDowns * STEP_DOWN_PTS +
        (longestStreak >= STREAK_MIN ? STREAK_BONUS_PTS : 0) +
        (totalDecline >= DEPTH_THRESHOLD ? DEPTH_BONUS_PTS : 0)
    );

    if (bestScore === null || companyScore > bestScore) bestScore = companyScore;

    if (stepDowns >= MIN_STEP_DOWNS_FOR_FINDING) {
      let runningQty = 0;
      let runningCost = 0;
      const avgCostBeforeEach: (number | null)[] = [];
      for (const b of companyBuys) {
        avgCostBeforeEach.push(runningQty > 0 ? Math.round((runningCost / runningQty) * 100) / 100 : null);
        runningCost += b.price * b.quantity;
        runningQty += b.quantity;
      }
      const currentAvgCost = runningQty > 0 ? runningCost / runningQty : null;
      const currentPriceRow = db.prepare('SELECT price FROM companies WHERE id = ?').get(companyBuys[0].company_id) as
        | { price: number }
        | undefined;
      const currentPrice = currentPriceRow?.price ?? null;

      const evidence: Evidence = {
        buys: prices,
        stepDowns,
        longestStreak,
        totalDeclinePct: Math.round(totalDecline * 1000) / 1000,
        avgCostBeforeEach: avgCostBeforeEach.map((v) => v ?? -1),
        currentUnrealizedPct:
          currentAvgCost && currentPrice ? Math.round(((currentPrice - currentAvgCost) / currentAvgCost) * 1000) / 1000 : 0
      };

      findings.push({
        id: newId(),
        type: 'AVERAGING_DOWN',
        detector: 'averagingDown',
        ticker: companyBuys[0].ticker,
        severity: longestStreak >= STREAK_MIN ? 'HIGH' : 'MEDIUM',
        evidence
      });
    }
  }

  if (bestScore === null) {
    return {
      status: { state: 'insufficient_data', sampleSize: maxBuysInAnyCompany, threshold: MIN_BUYS_PER_COMPANY },
      score: null,
      findings: []
    };
  }

  return {
    status: { state: 'ok', sampleSize: maxBuysInAnyCompany, threshold: MIN_BUYS_PER_COMPANY },
    score: bestScore,
    findings
  };
}
