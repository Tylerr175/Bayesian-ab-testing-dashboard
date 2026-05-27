// Mirrors the Pydantic models in backend/main.py exactly.

export interface AnalyzePayload {
  variants: Array<{ name: string; visitors: number; conversions: number }>;
  stop_threshold: number;
}

export interface BetaParams { alpha: number; beta: number }
export interface Interval   { lower: number; upper: number }

export interface VariantResult {
  name: string;
  posterior_params: BetaParams;
  posterior_mean: number;
  credible_interval: Interval;
  prob_best: number;
  expected_loss: number;
}

export interface Recommendation {
  action: 'STOP' | 'KEEP_TESTING';
  winner: string | null;  // variant name, or null when still testing
  winner_loss: number;
  threshold: number;
}

export interface AnalyzeResponse {
  variants: VariantResult[];
  recommendation: Recommendation;
}

export interface EstimatePayload {
  baseline_rate: number;
  minimum_lift: number;
  confidence_threshold: number;
}

export interface PowerCurvePoint {
  sample_size: number;
  power: number;
}

export interface EstimateResponse {
  sample_size_per_variant: number;
  total_sample_size: number;
  power_achieved: number;
  feasible: boolean;
  power_curve: PowerCurvePoint[];
}
