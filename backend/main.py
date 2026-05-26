import logging
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from bayesian_ab import analyze_ab_test

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

_started_at = datetime.now(timezone.utc)

# ── Rate limiter ───────────────────────────────────────────────────────────────
# Keyed by client IP; only /api/analyze carries the 30/minute decorator.
# Health endpoints are intentionally exempt.

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="BayesLab")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Origins are controlled via the ALLOWED_ORIGINS environment variable.
# Methods and headers are narrowed to what the API actually uses; wildcard
# allow_origins is never set — an empty env var falls back to localhost only.

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Maximum 30 requests per minute per IP."},
    )


# ── Request models ─────────────────────────────────────────────────────────────

class VariantInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    visitors: int = Field(..., ge=0, le=10_000_000)
    conversions: int = Field(..., ge=0, le=10_000_000)

    @model_validator(mode="after")
    def conversions_le_visitors(self) -> "VariantInput":
        if self.conversions > self.visitors:
            raise ValueError(
                f"Variant '{self.name}': conversions ({self.conversions}) "
                f"cannot exceed visitors ({self.visitors})."
            )
        return self


class AnalyzeRequest(BaseModel):
    # Multi-variant format (2–6 variants enforced in validator below)
    variants: Optional[list[VariantInput]] = Field(default=None, max_length=6)

    # Legacy two-variant fields (still accepted for backward compatibility)
    a_visitors:    Optional[int] = Field(default=None, ge=0, le=10_000_000)
    a_conversions: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    b_visitors:    Optional[int] = Field(default=None, ge=0, le=10_000_000)
    b_conversions: Optional[int] = Field(default=None, ge=0, le=10_000_000)

    prior_alpha:    float = Field(default=1.0, gt=0)
    prior_beta:     float = Field(default=1.0, gt=0)
    n_samples:      int   = Field(default=10_000, gt=0, le=200_000)
    stop_threshold: float = Field(default=0.005, gt=0)

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
        if len(self.variants) > 6:
            raise ValueError("Maximum 6 variants allowed.")
        return self


# ── Response models ────────────────────────────────────────────────────────────

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
@limiter.limit("30/minute")
def analyze(request: Request, req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        results = analyze_ab_test(
            [v.model_dump() for v in req.variants],
            prior_alpha=req.prior_alpha,
            prior_beta=req.prior_beta,
            n_samples=req.n_samples,
        )
    except ValueError:
        logger.warning(
            "ValueError during analysis (%d variants, n_samples=%d)",
            len(req.variants), req.n_samples,
        )
        raise HTTPException(
            status_code=422,
            detail="Analysis failed: please verify your input data is numerically valid.",
        )
    except (ArithmeticError, np.linalg.LinAlgError):
        logger.warning(
            "Numerical error during analysis (%d variants, n_samples=%d)",
            len(req.variants), req.n_samples,
        )
        raise HTTPException(
            status_code=422,
            detail="Analysis failed due to numerical issues with the input data.",
        )
    except MemoryError:
        logger.error(
            "MemoryError during analysis (n_samples=%d, n_variants=%d)",
            req.n_samples, len(req.variants),
        )
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    except Exception:
        logger.exception("Unexpected error in /api/analyze")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

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
