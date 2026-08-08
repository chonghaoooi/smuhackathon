export type DetectorId = 'fomo' | 'averagingDown' | 'concentration' | 'overtrading';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type MentalState = 'ZEN_INVESTOR' | 'MILDLY_QUESTIONABLE' | 'CONCERNED' | 'DENIAL' | 'EMOTIONAL_DAMAGE';

export interface Finding {
  id: string;
  type: string;
  detector: DetectorId;
  ticker?: string;
  severity: Severity;
  evidence: Record<string, unknown>;
}

export interface DetectorStatus {
  state: 'ok' | 'insufficient_data';
  sampleSize: number;
  threshold: number;
}

export interface TherapistResponse {
  scores: Record<DetectorId, number | null>;
  status: Record<DetectorId, DetectorStatus>;
  overall: {
    score: number | null;
    state: MentalState | null;
    detectorsIncluded: DetectorId[];
  };
  findings: Finding[];
  exposure: {
    holdings: { ticker: string; weight: number }[];
    sectors: { sector: string; weight: number }[];
  } | null;
  narrative: {
    roast: string;
    serious: string;
    available: boolean;
    source: 'llm' | 'fallback';
    error: string | null;
  };
  meta: {
    teamId: string;
    generatedAt: string;
    transactionCount: number;
  };
}

export const DETECTOR_LABELS: Record<DetectorId, string> = {
  fomo: 'FOMO',
  averagingDown: 'Averaging Down',
  concentration: 'Concentration',
  overtrading: 'Overtrading'
};

export const MENTAL_STATE_LABELS: Record<MentalState, string> = {
  ZEN_INVESTOR: 'Zen Investor',
  MILDLY_QUESTIONABLE: 'Mildly Questionable',
  CONCERNED: 'Concerned',
  DENIAL: 'Denial',
  EMOTIONAL_DAMAGE: 'Emotional Damage'
};

export const MENTAL_STATE_CLASS: Record<MentalState, string> = {
  ZEN_INVESTOR: 'state-zen',
  MILDLY_QUESTIONABLE: 'state-mild',
  CONCERNED: 'state-concerned',
  DENIAL: 'state-denial',
  EMOTIONAL_DAMAGE: 'state-damage'
};

export const DETECTOR_TONE: Record<DetectorId, string> = {
  fomo: 'hot',
  averagingDown: 'violet',
  concentration: 'cyan',
  overtrading: 'blue'
};

export const DETECTOR_BREAKDOWN: Record<DetectorId, string> = {
  fomo: '15 pts per >15% rally buy + 15 pts per top-10%-range buy + 7 repeat bonus',
  averagingDown: '12 pts per price step-down + 10 streak bonus + 15 depth-of-decline bonus',
  concentration: 'Top holding weight + top sector weight + HHI, each scored above a healthy baseline',
  overtrading: 'Trades/hour + gap tightness + portfolio turnover + buy-sell-rebuy round trips'
};
