// Mirrors the Pydantic models in backend/main.py exactly.

export interface AnalyzePayload {
  a_visitors: number;
  a_conversions: number;
  b_visitors: number;
  b_conversions: number;
  stop_threshold: number;
}

interface BetaParams        { alpha: number; beta: number }
interface VariantBetaParams { a: BetaParams; b: BetaParams }
interface VariantFloats     { a: number; b: number }
export interface Interval   { lower: number; upper: number }
interface VariantIntervals  { a: Interval; b: Interval }

export interface Recommendation {
  action: 'STOP' | 'KEEP_TESTING';
  winner: 'A' | 'B' | null;
  winner_loss: number;
  threshold: number;
}

export interface AnalyzeResponse {
  posterior_params: VariantBetaParams;
  posterior_means: VariantFloats;
  credible_intervals: VariantIntervals;
  prob_b_better: number;
  lift_ci: Interval;
  expected_loss: VariantFloats;
  recommendation: Recommendation;
}
