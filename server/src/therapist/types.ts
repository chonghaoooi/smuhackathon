export type DetectorId = 'fomo' | 'averagingDown' | 'concentration' | 'overtrading';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export type Evidence = Record<string, number | string | boolean | null | number[] | string[]>;

export interface Finding {
  id: string;
  type: string;
  detector: DetectorId;
  ticker?: string;
  severity: Severity;
  evidence: Evidence;
}

export interface DetectorStatus {
  state: 'ok' | 'insufficient_data';
  sampleSize: number;
  threshold: number;
}

export interface DetectorResult {
  status: DetectorStatus;
  score: number | null;
  findings: Finding[];
}

export type MentalState = 'ZEN_INVESTOR' | 'MILDLY_QUESTIONABLE' | 'CONCERNED' | 'DENIAL' | 'EMOTIONAL_DAMAGE';

export interface ConcentrationExposure {
  holdings: { ticker: string; weight: number }[];
  sectors: { sector: string; weight: number }[];
}

export interface EngineResult {
  scores: Record<DetectorId, number | null>;
  status: Record<DetectorId, DetectorStatus>;
  overall: {
    score: number | null;
    state: MentalState | null;
    detectorsIncluded: DetectorId[];
  };
  findings: Finding[];
  exposure: ConcentrationExposure | null;
  meta: {
    teamId: string;
    generatedAt: string;
    transactionCount: number;
  };
}
