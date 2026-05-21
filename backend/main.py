import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from bayesian_ab import analyze_ab_test

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

_started_at = datetime.now(timezone.utc)

app = FastAPI(title="Bayesian A/B Testing Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request ────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    a_visitors: int = Field(..., ge=0)
    a_conversions: int = Field(..., ge=0)
    b_visitors: int = Field(..., ge=0)
    b_conversions: int = Field(..., ge=0)
    prior_alpha: float = Field(default=1.0, gt=0)
    prior_beta: float = Field(default=1.0, gt=0)
    n_samples: int = Field(default=10_000, gt=0)
    stop_threshold: float = Field(default=0.005, gt=0)

    @model_validator(mode="after")
    def conversions_within_visitors(self) -> "AnalyzeRequest":
        if self.a_conversions > self.a_visitors:
            raise ValueError("a_conversions cannot exceed a_visitors")
        if self.b_conversions > self.b_visitors:
            raise ValueError("b_conversions cannot exceed b_visitors")
        return self


# ── Response ───────────────────────────────────────────────────────────────────

class BetaParams(BaseModel):
    alpha: float
    beta: float


class VariantBetaParams(BaseModel):
    a: BetaParams
    b: BetaParams


class VariantFloats(BaseModel):
    a: float
    b: float


class Interval(BaseModel):
    lower: float
    upper: float


class VariantIntervals(BaseModel):
    a: Interval
    b: Interval


class Recommendation(BaseModel):
    action: str          # "STOP" | "KEEP_TESTING"
    winner: Optional[str]  # "A" | "B", or None when action is KEEP_TESTING
    winner_loss: float
    threshold: float


class AnalyzeResponse(BaseModel):
    posterior_params: VariantBetaParams
    posterior_means: VariantFloats
    credible_intervals: VariantIntervals
    prob_b_better: float
    lift_ci: Interval
    expected_loss: VariantFloats
    recommendation: Recommendation


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/api/health")
def api_health():
    uptime = datetime.now(timezone.utc) - _started_at
    return {
        "status": "ok",
        "uptime_seconds": int(uptime.total_seconds()),
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        results = analyze_ab_test(
            req.a_visitors,
            req.a_conversions,
            req.b_visitors,
            req.b_conversions,
            prior_alpha=req.prior_alpha,
            prior_beta=req.prior_beta,
            n_samples=req.n_samples,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    loss = results["expected_loss"]
    if loss["a"] <= loss["b"]:
        winner, winner_loss = "A", loss["a"]
    else:
        winner, winner_loss = "B", loss["b"]

    action = "STOP" if winner_loss < req.stop_threshold else "KEEP_TESTING"

    logger.info(
        "analyze | "
        "A=%d/%d (%.1f%%)  B=%d/%d (%.1f%%) | "
        "P(B>A)=%.1f%%  action=%s  winner=%s  loss=%.4f%%",
        req.a_conversions, req.a_visitors, 100 * req.a_conversions / req.a_visitors if req.a_visitors else 0,
        req.b_conversions, req.b_visitors, 100 * req.b_conversions / req.b_visitors if req.b_visitors else 0,
        100 * results["prob_b_better"],
        action,
        winner if action == "STOP" else "-",
        100 * winner_loss,
    )

    ci = results["credible_intervals"]
    lift_lo, lift_hi = results["lift_ci"]

    return AnalyzeResponse(
        posterior_params=VariantBetaParams(
            a=BetaParams(**results["posterior_params"]["a"]),
            b=BetaParams(**results["posterior_params"]["b"]),
        ),
        posterior_means=VariantFloats(**results["posterior_means"]),
        credible_intervals=VariantIntervals(
            a=Interval(lower=ci["a"][0], upper=ci["a"][1]),
            b=Interval(lower=ci["b"][0], upper=ci["b"][1]),
        ),
        prob_b_better=results["prob_b_better"],
        lift_ci=Interval(lower=lift_lo, upper=lift_hi),
        expected_loss=VariantFloats(**results["expected_loss"]),
        recommendation=Recommendation(
            action=action,
            winner=winner if action == "STOP" else None,
            winner_loss=winner_loss,
            threshold=req.stop_threshold,
        ),
    )
