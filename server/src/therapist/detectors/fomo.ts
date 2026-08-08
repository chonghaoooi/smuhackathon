import { db } from '../../db.js';
import { id as newId } from '../../utils.js';
import { clampScore } from '../scoring.js';
import type { DetectorResult, Evidence, Severity } from '../types.js';

const LOOKBACK_MS_PRIMARY = 20 * 60 * 1000; // 20 min
const LOOKBACK_MS_FALLBACK = 90 * 60 * 1000; // 90 min
const RALLY_THRESHOLD = 0.15;
const TOP_RANGE_THRESHOLD = 0.9;
const MIN_BUYS_FOR_DETECTOR = 3;
const REPEATED_PATTERN_BONUS = 7;
const REPEATED_PATTERN_MIN_COUNT = 2;

interface BuyRow {
  company_id: string;
  ticker: string;
  price: number;
  created_at: string;
}

interface PricePoint {
  createdAt: number;
  price: number;
}

function toEpoch(sqliteTimestamp: string): number {
  return Date.parse(sqliteTimestamp.replace(' ', 'T') + 'Z');
}

function loadPriceSeries(companyId: string): PricePoint[] {
  const rows = db
    .prepare(
      `SELECT created_at, price FROM stock_price_history WHERE company_id = ?
       UNION ALL
       SELECT created_at, price FROM transactions WHERE company_id = ?
       ORDER BY created_at ASC`
    )
    .all(companyId, companyId) as { created_at: string; price: number }[];
  return rows.map((r) => ({ createdAt: toEpoch(r.created_at), price: r.price })).sort((a, b) => a.createdAt - b.createdAt);
}

function windowFor(series: PricePoint[], buyTime: number, lookbackMs: number): PricePoint[] {
  return series.filter((p) => p.createdAt <= buyTime && p.createdAt >= buyTime - lookbackMs);
}

export function detectFomo(teamId: string): DetectorResult {
  const buys = db
    .prepare(
      `SELECT t.company_id, c.ticker, t.price, t.created_at
       FROM transactions t JOIN companies c ON c.id = t.company_id
       WHERE t.team_id = ? AND t.action = 'BUY'
       ORDER BY t.created_at ASC`
    )
    .all(teamId) as BuyRow[];

  const seriesCache = new Map<string, PricePoint[]>();
  const getSeries = (companyId: string) => {
    if (!seriesCache.has(companyId)) seriesCache.set(companyId, loadPriceSeries(companyId));
    return seriesCache.get(companyId)!;
  };

  let evaluated = 0;
  let rallyCount = 0;
  let topRangeCount = 0;
  const findings: DetectorResult['findings'] = [];

  for (const buy of buys) {
    const series = getSeries(buy.company_id);
    const buyTime = toEpoch(buy.created_at);

    let window = windowFor(series, buyTime, LOOKBACK_MS_PRIMARY);
    if (window.length < 2) window = windowFor(series, buyTime, LOOKBACK_MS_FALLBACK);
    if (window.length < 2) continue; // no reliable reference data for this transaction

    evaluated += 1;

    const earlierPrice = window[0].price;
    const recentHigh = Math.max(...window.map((p) => p.price));
    const recentLow = Math.min(...window.map((p) => p.price));
    const recentReturn = earlierPrice > 0 ? buy.price / earlierPrice - 1 : 0;

    let rangePosition: number | null = null;
    if (recentHigh !== recentLow) rangePosition = (buy.price - recentLow) / (recentHigh - recentLow);

    const rallyFlag = recentReturn > RALLY_THRESHOLD;
    const topRangeFlag = rangePosition !== null && rangePosition > TOP_RANGE_THRESHOLD;

    if (rallyFlag) rallyCount += 1;
    if (topRangeFlag) topRangeCount += 1;

    if (rallyFlag || topRangeFlag) {
      const severity: Severity = rallyFlag && topRangeFlag ? 'HIGH' : 'MEDIUM';
      const evidence: Evidence = {
        recentReturn: Math.round(recentReturn * 1000) / 1000,
        rangePosition: rangePosition === null ? -1 : Math.round(rangePosition * 1000) / 1000,
        referencePrice: earlierPrice,
        buyPrice: buy.price
      };
      findings.push({
        id: newId(),
        type: 'FOMO_PURCHASE',
        detector: 'fomo',
        ticker: buy.ticker,
        severity,
        evidence
      });
    }
  }

  if (evaluated < MIN_BUYS_FOR_DETECTOR) {
    return {
      status: { state: 'insufficient_data', sampleSize: evaluated, threshold: MIN_BUYS_FOR_DETECTOR },
      score: null,
      findings: []
    };
  }

  const repeatedBonus =
    rallyCount >= REPEATED_PATTERN_MIN_COUNT && topRangeCount >= REPEATED_PATTERN_MIN_COUNT ? REPEATED_PATTERN_BONUS : 0;
  const score = clampScore(rallyCount * 15 + topRangeCount * 15 + repeatedBonus);

  return {
    status: { state: 'ok', sampleSize: evaluated, threshold: MIN_BUYS_FOR_DETECTOR },
    score,
    findings
  };
}
