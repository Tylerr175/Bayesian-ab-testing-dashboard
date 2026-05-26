"""Tests for the FastAPI /api/analyze endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "variants": [
        {"name": "A", "visitors": 1000, "conversions": 100},
        {"name": "B", "visitors": 1000, "conversions": 120},
    ]
}


# ── Validation ────────────────────────────────────────────────────────────────

def test_conversions_exceed_visitors_returns_422():
    """conversions > visitors must be rejected before analysis runs."""
    resp = client.post("/api/analyze", json={
        "variants": [
            {"name": "A", "visitors": 100, "conversions": 150},  # invalid
            {"name": "B", "visitors": 100, "conversions":  50},
        ]
    })
    assert resp.status_code == 422


def test_single_variant_returns_422():
    """Fewer than 2 variants must be rejected."""
    resp = client.post("/api/analyze", json={
        "variants": [
            {"name": "A", "visitors": 100, "conversions": 10},
        ]
    })
    assert resp.status_code == 422


def test_missing_body_returns_422():
    """No body at all must be rejected."""
    resp = client.post("/api/analyze")
    assert resp.status_code == 422


def test_negative_visitors_returns_422():
    """Negative visitor count must be rejected by field-level validation."""
    resp = client.post("/api/analyze", json={
        "variants": [
            {"name": "A", "visitors": -1, "conversions": 0},
            {"name": "B", "visitors": 100, "conversions": 10},
        ]
    })
    assert resp.status_code == 422


# ── Happy path ────────────────────────────────────────────────────────────────

def test_happy_path_returns_200():
    resp = client.post("/api/analyze", json=VALID_PAYLOAD)
    assert resp.status_code == 200


def test_happy_path_response_schema():
    """Response must include all required fields with correct types."""
    resp = client.post("/api/analyze", json=VALID_PAYLOAD)
    body = resp.json()

    # Top-level keys
    assert "variants" in body
    assert "recommendation" in body
    assert len(body["variants"]) == 2

    # Per-variant shape
    for v in body["variants"]:
        assert isinstance(v["name"], str)
        assert isinstance(v["prob_best"], float)
        assert isinstance(v["expected_loss"], float)
        assert isinstance(v["posterior_mean"], float)
        ci = v["credible_interval"]
        assert isinstance(ci["lower"], float)
        assert isinstance(ci["upper"], float)
        assert ci["lower"] < ci["upper"]
        pp = v["posterior_params"]
        assert isinstance(pp["alpha"], float)
        assert isinstance(pp["beta"], float)

    # Recommendation shape
    rec = body["recommendation"]
    assert rec["action"] in ("STOP", "KEEP_TESTING")
    assert isinstance(rec["winner_loss"], float)
    assert isinstance(rec["threshold"], float)
    assert rec["threshold"] > 0


def test_happy_path_prob_best_sums_to_one():
    """prob_best values returned by the API must sum to 1.0."""
    resp = client.post("/api/analyze", json=VALID_PAYLOAD)
    variants = resp.json()["variants"]
    total = sum(v["prob_best"] for v in variants)
    assert abs(total - 1.0) < 0.001, f"API prob_best sum = {total:.6f}"


def test_stop_action_includes_winner():
    """When action=STOP the winner field must be a non-empty string."""
    # High-confidence payload: B dominates overwhelmingly
    resp = client.post("/api/analyze", json={
        "variants": [
            {"name": "A", "visitors": 10000, "conversions":  500},
            {"name": "B", "visitors": 10000, "conversions": 1500},
        ],
        "stop_threshold": 0.5,  # very lenient — forces STOP
    })
    assert resp.status_code == 200
    rec = resp.json()["recommendation"]
    assert rec["action"] == "STOP"
    assert isinstance(rec["winner"], str) and rec["winner"] != ""


def test_keep_testing_winner_is_null():
    """When action=KEEP_TESTING the winner field must be null."""
    # Tiny sample, tight threshold → should stay in KEEP_TESTING
    resp = client.post("/api/analyze", json={
        "variants": [
            {"name": "A", "visitors": 10, "conversions": 5},
            {"name": "B", "visitors": 10, "conversions": 6},
        ],
        "stop_threshold": 0.0001,  # extremely tight → never stops
    })
    assert resp.status_code == 200
    rec = resp.json()["recommendation"]
    assert rec["action"] == "KEEP_TESTING"
    assert rec["winner"] is None


# ── Health endpoints ──────────────────────────────────────────────────────────

def test_root_health_check():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_api_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert isinstance(body["uptime_seconds"], int)
