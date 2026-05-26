"""Tests for estimate_sample_size and POST /api/estimate-sample-size."""

from fastapi.testclient import TestClient

from bayesian_ab import estimate_sample_size
from main import app

client = TestClient(app)


def test_sanity_reasonable_sample_size():
    result = estimate_sample_size(baseline_rate=0.10, minimum_lift=0.05, seed=42)
    assert isinstance(result["sample_size_per_variant"], int)
    assert result["sample_size_per_variant"] > 0
    assert result["feasible"] is True
    assert 0.0 <= result["power_achieved"] <= 1.0


def test_monotonicity_smaller_lift_needs_more_samples():
    large = estimate_sample_size(baseline_rate=0.10, minimum_lift=0.10, seed=42)
    small = estimate_sample_size(baseline_rate=0.10, minimum_lift=0.02, seed=42)
    assert small["sample_size_per_variant"] > large["sample_size_per_variant"]


def test_api_rejects_baseline_plus_lift_over_one():
    resp = client.post("/api/estimate-sample-size", json={
        "baseline_rate": 0.90,
        "minimum_lift":  0.15,
    })
    assert resp.status_code == 422
