import { db } from '../../db.js';
import { id as newId } from '../../utils.js';
import { clampScore } from '../scoring.js';
import type { ConcentrationExposure, DetectorResult, Evidence, Finding, Severity } from '../types.js';

// Baselines approximate a healthy ~5-7 holding diversified book. Tunable.
const SINGLE_HOLDING_BASELINE = 0.2;
const SECTOR_BASELINE = 0.35;
const HHI_BASELINE = 0.15;
const SINGLE_HOLDING_FINDING_THRESHOLD = 0.3;
const SECTOR_FINDING_THRESHOLD = 0.4;

interface HoldingRow {
  company_id: string;
  ticker: string;
  sector: string;
  quantity: number;
  price: number;
  holding_value: number;
}

export interface ConcentrationDetectorResult extends DetectorResult {
  exposure: ConcentrationExposure | null;
}

export function detectConcentration(teamId: string): ConcentrationDetectorResult {
  const holdings = db
    .prepare(
      `SELECT h.company_id, c.ticker, c.sector, h.quantity, c.price,
              h.quantity * c.price AS holding_value
       FROM holdings h JOIN companies c ON c.id = h.company_id
       WHERE h.team_id = ? AND h.quantity > 0`
    )
    .all(teamId) as HoldingRow[];

  if (!holdings.length) {
    return {
      status: { state: 'insufficient_data', sampleSize: 0, threshold: 1 },
      score: null,
      findings: [],
      exposure: null
    };
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.holding_value, 0);
  if (totalValue <= 0) {
    return {
      status: { state: 'insufficient_data', sampleSize: 0, threshold: 1 },
      score: null,
      findings: [],
      exposure: null
    };
  }

  const holdingWeights = holdings
    .map((h) => ({ ticker: h.ticker, weight: h.holding_value / totalValue, value: h.holding_value }))
    .sort((a, b) => b.weight - a.weight);

  const sectorValues = new Map<string, number>();
  for (const h of holdings) sectorValues.set(h.sector, (sectorValues.get(h.sector) ?? 0) + h.holding_value);
  const sectorWeights = [...sectorValues.entries()]
    .map(([sector, value]) => ({ sector, weight: value / totalValue }))
    .sort((a, b) => b.weight - a.weight);

  const hhi = holdingWeights.reduce((sum, h) => sum + h.weight * h.weight, 0);

  const maxHoldingWeight = holdingWeights[0].weight;
  const maxSectorExposure = sectorWeights[0].weight;

  const holdingPts = clampRatio((maxHoldingWeight - SINGLE_HOLDING_BASELINE) / (1 - SINGLE_HOLDING_BASELINE)) * 40;
  const sectorPts = clampRatio((maxSectorExposure - SECTOR_BASELINE) / (1 - SECTOR_BASELINE)) * 35;
  const hhiPts = clampRatio((hhi - HHI_BASELINE) / (1 - HHI_BASELINE)) * 25;
  const score = clampScore(holdingPts + sectorPts + hhiPts);

  const findings: Finding[] = [];
  if (maxHoldingWeight > SINGLE_HOLDING_FINDING_THRESHOLD) {
    const top = holdingWeights[0];
    const severity: Severity = maxHoldingWeight > 0.5 ? 'HIGH' : 'MEDIUM';
    findings.push({
      id: newId(),
      type: 'CONCENTRATION_HOLDING',
      detector: 'concentration',
      ticker: top.ticker,
      severity,
      evidence: {
        weight: top.weight,
        valueAtRisk: top.value,
        otherHoldingsCount: holdings.length - 1
      } satisfies Evidence
    });
  }
  if (maxSectorExposure > SECTOR_FINDING_THRESHOLD) {
    const topSector = sectorWeights[0];
    const severity: Severity = maxSectorExposure > 0.65 ? 'HIGH' : 'MEDIUM';
    findings.push({
      id: newId(),
      type: 'CONCENTRATION_SECTOR',
      detector: 'concentration',
      severity,
      evidence: {
        sector: topSector.sector,
        weight: topSector.weight,
        holdingsInSector: holdings.filter((h) => h.sector === topSector.sector).length,
        totalHoldings: holdings.length
      } satisfies Evidence
    });
  }

  return {
    status: { state: 'ok', sampleSize: holdings.length, threshold: 1 },
    score,
    findings,
    exposure: {
      holdings: holdingWeights.map(({ ticker, weight }) => ({ ticker, weight })),
      sectors: sectorWeights.map(({ sector, weight }) => ({ sector, weight }))
    }
  };
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}
