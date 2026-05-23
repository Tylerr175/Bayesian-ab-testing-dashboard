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

class VariantInput(BaseModel):
    name: str = Field(..., min_length=1)
    visitors: int = Field(..., ge=0)
    conversions: int = Field(..., ge=0)


class AnalyzeRequest(BaseModel):
    # New multi-variant format
    variants: Optional[list[VariantInput]] = None

    # Legacy two-variant fields (still accepted for backward compatibility)
    a_visitors:   Optional[int] = Field(default=None, ge=0)
    a_conversions: Optional[int] = Field(default=None, ge=0)
    b_visitors:   Optional[int] = Field(default=None, ge=0)
    b_conversions: Optional[int] = Field(default=None, ge=0)

    prior_alpha:     float = Field(default=1.0, gt=0)
    prior_beta:      float = Field(default=1.0, gt=0)
    n_samples:       int   = Field(default=10_000, gt=0)
    stop_threshold:  float = Field(default=0.005, gt=0)

    @model_validator(mode="after")
    def resolve_variants(self) -> "AnalyzeRequest":
        legacy = all(
            x is not None
            for x in [self.a_visitors, self.a_conversions,
                      self.b_visitors, self.b_conversions]
        )
        if not legacy and self.variants is None:
            raise ValueError(
                "Provide either a 'variants' list or the legacy "
                "a_visitors / a_conversions / b_visitors / b_conversions fields."
            )
        if legacy:
            self.variants = [
                VariantInput(name="A",
                             visitors=self.a_visitors,
                             conversions=self.a_conversions),
                VariantInput(name="B",
                             visitors=self.b_visitors,
                             conversions=self.b_conversions),
            ]
        if len(self.variants) < 2:
            raise ValueError("At least 2 variants are required.")
        for v in self.variants:
            if v.conversions > v.visitors:
                raise ValueError(
                    f"Variant '{v.name}': conversions ({v.conversions}) "
                    f"cannot exceed visitors ({v.visitors})."
                )
        return self


# ── Response ───────────────────────────────────────────────────────────────────

class BetaParams(BaseModel):
    alpha: float
    beta: float


class Interval(BaseModel):
    lower: float
    upper: float


class VariantResult(BaseModel):
    name: str
    posterior_params: BetaParams
    posterior_mean: float
    credible_interval: Interval
    prob_best: float
    expected_loss: float


class Recommendation(BaseModel):
    action: str            # "STOP" | "KEEP_TESTING"
    winner: Optional[str]  # variant name, or None when action is KEEP_TESTING
    winner_loss: float
    threshold: float


class AnalyzeResponse(BaseModel):
    variants: list[VariantResult]
    recommendation: Recommendation


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/api/health")
def api_health():
    uptime = datetime.now(timezone.utc) - _started_at
    return {"status": "ok", "uptime_seconds": int(uptime.total_seconds())}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        results = analyze_ab_test(
            [v.model_dump() for v in req.variants],
            prior_alpha=req.prior_alpha,
            prior_beta=req.prior_beta,
            n_samples=req.n_samples,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    winner_loss = results["winner_expected_loss"]
    winner_name = results["winner"]
    action      = "STOP" if winner_loss < req.stop_threshold else "KEEP_TESTING"

    names  = [v["name"] for v in results["variants"]]
    rates  = [f"{v['posterior_mean'] * 100:.1f}%" for v in results["variants"]]
    logger.info(
        "analyze | %s | winner=%s  action=%s  loss=%.4f%%",
        "  ".join(f"{n}={r}" for n, r in zip(names, rates)),
        winner_name if action == "STOP" else "-",
        action,
        winner_loss * 100,
    )

    variant_results = []
    for v in results["variants"]:
        ci = v["credible_interval"]
        variant_results.append(VariantResult(
            name=v["name"],
            posterior_params=BetaParams(**v["posterior_params"]),
            posterior_mean=v["posterior_mean"],
            credible_interval=Interval(lower=ci[0], upper=ci[1]),
            prob_best=v["prob_best"],
            expected_loss=v["expected_loss"],
        ))

    return AnalyzeResponse(
        variants=variant_results,
        recommendation=Recommendation(
            action=action,
            winner=winner_name if action == "STOP" else None,
            winner_loss=winner_loss,
            threshold=req.stop_threshold,
        ),
    )
