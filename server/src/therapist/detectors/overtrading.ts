import { db } from '../../db.js';
import { id as newId } from '../../utils.js';
import { clampScore } from '../scoring.js';
import type { DetectorResult, Evidence } from '../types.js';

const MIN_TRADES = 5;
const TRADES_PER_HOUR_SATURATION = 40;
const MEDIAN_GAP_FULL_POINTS_SECONDS = 300; // 5 min
const TURNOVER_SATURATION = 4; // 4x net worth churned

interface TxRow {
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  company_id: string;
  created_at: string;
}

function netWorth(teamId: string): number {
  const team = db.prepare('SELECT cash FROM teams WHERE id = ?').get(teamId) as { cash: number } | undefined;
  if (!team) return 0;
  const portfolio = db
    .prepare(
      `SELECT COALESCE(SUM(h.quantity * c.price), 0) AS value
       FROM holdings h JOIN companies c ON c.id = h.company_id
       WHERE h.team_id = ?`
    )
    .get(teamId) as { value: number };
  return team.cash + portfolio.value;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function countRoundTrips(rows: TxRow[]): number {
  const byCompany = new Map<string, TxRow[]>();
  for (const row of rows) {
    const list = byCompany.get(row.company_id) ?? [];
    list.push(row);
    byCompany.set(row.company_id, list);
  }
  let roundTrips = 0;
  for (const list of byCompany.values()) {
    // pattern: BUY, SELL, BUY (in order) counts as one round trip; scan with a small state machine
    let state: 'idle' | 'boughtOnce' | 'sold' = 'idle';
    for (const row of list) {
      if (state === 'idle' && row.action === 'BUY') state = 'boughtOnce';
      else if (state === 'boughtOnce' && row.action === 'SELL') state = 'sold';
      else if (state === 'sold' && row.action === 'BUY') {
        roundTrips += 1;
        state = 'boughtOnce';
      }
    }
  }
  return roundTrips;
}

export function detectOvertrading(teamId: string): DetectorResult {
  const rows = db
    .prepare(
      `SELECT action, quantity, price, company_id, created_at
       FROM transactions WHERE team_id = ? ORDER BY created_at ASC`
    )
    .all(teamId) as TxRow[];

  const n = rows.length;
  if (n < MIN_TRADES) {
    return { status: { state: 'insufficient_data', sampleSize: n, threshold: MIN_TRADES }, score: null, findings: [] };
  }

  const timestamps = rows.map((r) => Date.parse(r.created_at.replace(' ', 'T') + 'Z'));
  const firstAt = timestamps[0];
  const lastAt = timestamps[n - 1];
  const sessionMinutes = Math.max(1, (lastAt - firstAt) / 60000);
  const tradesPerHour = n / (sessionMinutes / 60);

  const gapsSeconds: number[] = [];
  for (let i = 1; i < timestamps.length; i++) gapsSeconds.push((timestamps[i] - timestamps[i - 1]) / 1000);
  const medianGapSeconds = median(gapsSeconds);

  const grossTraded = rows.reduce((sum, r) => sum + r.quantity * r.price, 0);
  const worth = netWorth(teamId);
  const turnover = worth > 0 ? grossTraded / worth : 0;

  const roundTrips = countRoundTrips(rows);

  const hourPts = clampRatio(tradesPerHour / TRADES_PER_HOUR_SATURATION) * 40;
  const gapPts = clampRatio((MEDIAN_GAP_FULL_POINTS_SECONDS - medianGapSeconds) / MEDIAN_GAP_FULL_POINTS_SECONDS) * 30;
  const turnoverPts = clampRatio(turnover / TURNOVER_SATURATION) * 20;
  const roundTripPts = Math.min(10, roundTrips * 2);

  const score = clampScore(hourPts + gapPts + turnoverPts + roundTripPts);

  const evidence: Evidence = {
    totalTrades: n,
    sessionMinutes: Math.round(sessionMinutes * 10) / 10,
    tradesPerHour: Math.round(tradesPerHour * 10) / 10,
    medianGapSeconds: Math.round(medianGapSeconds),
    turnover: Math.round(turnover * 100) / 100,
    roundTrips
  };

  return {
    status: { state: 'ok', sampleSize: n, threshold: MIN_TRADES },
    score,
    findings: [
      {
        id: newId(),
        type: 'OVERTRADING',
        detector: 'overtrading',
        severity: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
        evidence
      }
    ]
  };
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}
