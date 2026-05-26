"""Tests for the Bayesian A/B testing engine (bayesian_ab.py)."""

import numpy as np
import pytest
from scipy.special import betaln

from bayesian_ab import analyze_ab_test


# ── Analytical reference ───────────────────────────────────────────────────────

def _exact_p_b_beats_a(alpha_a: float, beta_a: float,
                        alpha_b: float, beta_b: float) -> float:
    """Exact P(θ_B > θ_A) via Evan Miller's closed-form sum for two Beta posteriors.

    Reference: https://www.evanmiller.org/bayesian-ab-testing.html

        P(B > A) = Σ_{i=0}^{α_B - 1}
                       exp[ logB(α_A + i, β_A + β_B)
                            − log(β_B + i)
                            − logB(1 + i, β_B)
                            − logB(α_A, β_A) ]

    Valid for integer α_B (always true here: uniform prior + integer conversions).
    """
    log_terms = np.array([
        betaln(alpha_a + i, beta_a + beta_b)
        - np.log(beta_b + i)
        - betaln(1 + i, beta_b)
        - betaln(alpha_a, beta_a)
        for i in range(int(alpha_b))
    ])
    return float(np.sum(np.exp(log_terms)))


# ── 1. prob_best sums to 1.0 ──────────────────────────────────────────────────

@pytest.mark.parametrize("variants", [
    [   # 3 variants, balanced traffic
        {"name": "A", "visitors": 1000, "conversions": 100},
        {"name": "B", "visitors":  800, "conversions":  95},
        {"name": "C", "visitors": 1200, "conversions": 130},
    ],
    [   # 4 variants
        {"name": "A", "visitors": 500, "conversions": 50},
        {"name": "B", "visitors": 500, "conversions": 60},
        {"name": "C", "visitors": 500, "conversions": 55},
        {"name": "D", "visitors": 500, "conversions": 45},
    ],
    [   # 5 variants, uneven traffic
        {"name": "A", "visitors": 200, "conversions": 20},
        {"name": "B", "visitors": 300, "conversions": 35},
        {"name": "C", "visitors": 150, "conversions": 18},
        {"name": "D", "visitors": 400, "conversions": 42},
        {"name": "E", "visitors": 250, "conversions": 28},
    ],
    [   # 6 variants (maximum)
        {"name": "A", "visitors": 100, "conversions": 10},
        {"name": "B", "visitors": 200, "conversions": 22},
        {"name": "C", "visitors": 150, "conversions": 17},
        {"name": "D", "visitors": 300, "conversions": 31},
        {"name": "E", "visitors": 250, "conversions": 26},
        {"name": "F", "visitors": 180, "conversions": 19},
    ],
])
def test_prob_best_sums_to_one(variants):
    result = analyze_ab_test(variants, n_samples=10_000, seed=42)
    total = sum(v["prob_best"] for v in result["variants"])
    assert abs(total - 1.0) < 0.001, (
        f"prob_best values sum to {total:.6f}, expected 1.0 ± 0.001"
    )


# ── 2. Symmetry — identical inputs produce ~50% each ─────────────────────────

def test_symmetry_identical_variants():
    """With equal data, both variants must each receive ≈50% probability of being best."""
    variants = [
        {"name": "A", "visitors": 1000, "conversions": 100},
        {"name": "B", "visitors": 1000, "conversions": 100},
    ]
    result = analyze_ab_test(variants, n_samples=10_000, seed=0)
    for v in result["variants"]:
        assert 0.49 <= v["prob_best"] <= 0.51, (
            f"Variant {v['name']}: prob_best={v['prob_best']:.4f}, expected 0.49–0.51"
        )


# ── 3. Convergence vs. known analytical result ────────────────────────────────

def test_convergence_vs_analytical():
    """Monte Carlo estimate of P(B best) must be within 0.01 of the exact value.

    Setup (uniform prior → Beta posteriors):
        A: visitors=100, conversions=50  →  Beta(51, 51)
        B: visitors=100, conversions=60  →  Beta(61, 41)

    Analytical P(B > A) computed via Evan Miller's formula = 0.9214 (pre-verified).
    With n_samples=100_000 the MC standard error is ≈ 0.003, so 0.01 is a safe margin.
    """
    # Pre-verified: _exact_p_b_beats_a(51, 51, 61, 41) == 0.921426
    ANALYTICAL = 0.921426

    variants = [
        {"name": "A", "visitors": 100, "conversions": 50},
        {"name": "B", "visitors": 100, "conversions": 60},
    ]
    result = analyze_ab_test(variants, n_samples=100_000, seed=42)
    prob_b = next(v["prob_best"] for v in result["variants"] if v["name"] == "B")

    # Cross-check our hardcoded constant against the formula at test time
    formula_value = _exact_p_b_beats_a(51, 51, 61, 41)
    assert abs(formula_value - ANALYTICAL) < 1e-4, "Analytical constant drifted — update ANALYTICAL"

    assert abs(prob_b - ANALYTICAL) < 0.01, (
        f"Monte Carlo prob_best(B)={prob_b:.4f}, analytical={ANALYTICAL:.4f}, "
        f"delta={abs(prob_b - ANALYTICAL):.4f} (limit 0.01)"
    )


# ── 4. Edge cases — no crashes, sensible output ───────────────────────────────

def test_edge_zero_conversions():
    """Variant with zero conversions should not crash; clear loser should have lower prob_best."""
    result = analyze_ab_test([
        {"name": "A", "visitors": 500, "conversions":  0},
        {"name": "B", "visitors": 500, "conversions": 50},
    ], n_samples=5_000, seed=1)

    by_name = {v["name"]: v for v in result["variants"]}
    assert by_name["A"]["prob_best"] < by_name["B"]["prob_best"]
    assert abs(by_name["A"]["prob_best"] + by_name["B"]["prob_best"] - 1.0) < 0.001


def test_edge_full_conversion():
    """Variant converting every visitor should dominate completely."""
    result = analyze_ab_test([
        {"name": "A", "visitors": 100, "conversions": 100},
        {"name": "B", "visitors": 100, "conversions":  50},
    ], n_samples=5_000, seed=2)

    by_name = {v["name"]: v for v in result["variants"]}
    assert by_name["A"]["prob_best"] > 0.99, (
        f"Expected A (100% CVR) to dominate, got prob_best={by_name['A']['prob_best']:.4f}"
    )


def test_edge_tiny_sample():
    """Single visitor, zero conversions for both — should not crash and must sum to 1."""
    result = analyze_ab_test([
        {"name": "A", "visitors": 1, "conversions": 0},
        {"name": "B", "visitors": 1, "conversions": 0},
    ], n_samples=5_000, seed=3)

    total = sum(v["prob_best"] for v in result["variants"])
    assert abs(total - 1.0) < 0.001


def test_edge_imbalanced_traffic():
    """10× traffic imbalance with same conversion rate — valid output, sums to 1."""
    result = analyze_ab_test([
        {"name": "A", "visitors":  100, "conversions": 10},
        {"name": "B", "visitors": 1000, "conversions": 100},
    ], n_samples=10_000, seed=4)

    for v in result["variants"]:
        assert 0.0 <= v["prob_best"] <= 1.0, (
            f"prob_best out of range: {v['name']}={v['prob_best']}"
        )
    total = sum(v["prob_best"] for v in result["variants"])
    assert abs(total - 1.0) < 0.001


# ── 5. Output structure ───────────────────────────────────────────────────────

def test_output_keys_present():
    """Every variant result must carry the expected keys."""
    result = analyze_ab_test([
        {"name": "A", "visitors": 200, "conversions": 20},
        {"name": "B", "visitors": 200, "conversions": 25},
    ], n_samples=1_000, seed=99)

    assert "winner" in result
    assert "winner_prob_best" in result
    assert "winner_expected_loss" in result

    for v in result["variants"]:
        for key in ("name", "posterior_params", "posterior_mean",
                    "credible_interval", "prob_best", "expected_loss"):
            assert key in v, f"Missing key '{key}' in variant result"

    ci = result["variants"][0]["credible_interval"]
    assert ci[0] < ci[1], "Credible interval lower bound must be < upper bound"
