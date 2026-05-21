# Bayesian A/B Testing Dashboard

A full-stack dashboard for analyzing A/B test results using a Bayesian Beta-Binomial model. Enter visitor and conversion counts for two variants and get posterior distributions, credible intervals, probability that B beats A, and a statistically grounded recommendation on whether to stop the test.

## How it works

Rather than a frequentist p-value, the analysis produces:

- **Posterior conversion-rate distributions** — a full probability distribution over every rate consistent with the observed data, computed via the Beta-Binomial conjugate update rule
- **P(B > A)** — the fraction of Monte Carlo samples where B's sampled rate exceeds A's
- **95% credible interval** — the range where the true rate lies with 95% probability
- **Expected loss** — how much conversion rate you'd forfeit by declaring a winner now if you're wrong; the test is safe to stop when this drops below a threshold (default 0.5%)

## Stack

| Layer | Technology |
|---|---|
| Analysis engine | Python · NumPy · SciPy |
| API | FastAPI · Pydantic · Uvicorn |
| Frontend | Next.js 16 · React 19 · TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts (Beta PDF computed client-side via Lanczos log-Gamma) |

## Project structure

```
├── backend/
│   ├── bayesian_ab.py      # Core analysis engine
│   ├── main.py             # FastAPI app, Pydantic models, endpoints
│   ├── requirements.txt
│   └── .venv/              # Python virtual environment (git-ignored)
│
└── frontend/
    ├── app/
    │   ├── page.tsx         # Homepage
    │   ├── layout.tsx
    │   ├── ui/
    │   │   ├── VariantForm.tsx    # Input form with validation + fetch
    │   │   ├── ResultsPanel.tsx   # Results layout
    │   │   └── PosteriorChart.tsx # Recharts Beta PDF visualization
    │   └── lib/
    │       └── types.ts     # Shared TypeScript types (mirrors Pydantic models)
    ├── package.json
    └── node_modules/        # (git-ignored)
```

## Running locally

You need two terminals — one for the backend, one for the frontend.

**Backend**

```bash
cd backend
.venv/bin/uvicorn main:app --reload
# → http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000).

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Root health check |
| `GET` | `/api/health` | Health check with server uptime |
| `POST` | `/api/analyze` | Run Bayesian analysis |

**POST /api/analyze — request body**

```json
{
  "a_visitors": 1000,
  "a_conversions": 100,
  "b_visitors": 1000,
  "b_conversions": 130,
  "prior_alpha": 1,
  "prior_beta": 1,
  "n_samples": 10000,
  "stop_threshold": 0.005
}
```

**Response (abbreviated)**

```json
{
  "posterior_means": { "a": 0.1008, "b": 0.1307 },
  "prob_b_better": 0.9841,
  "lift_ci": { "lower": 0.0028, "upper": 0.0577 },
  "expected_loss": { "a": 0.0300, "b": 0.0001 },
  "recommendation": { "action": "STOP", "winner": "B", "winner_loss": 0.0001, "threshold": 0.005 }
}
```
