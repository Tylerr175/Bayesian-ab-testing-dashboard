import numpy as np
from scipy import stats


def analyze_ab_test(
    variants,
    prior_alpha=1,
    prior_beta=1,
    n_samples=10_000,
    seed=None,
):
    """
    Bayesian A/B(/C/D/…) test using a Beta-Binomial conjugate model.

    Parameters
    ----------
    variants    : list[dict] — each dict must have:
                    "name"        : str  — display label
                    "visitors"    : int  — total visitors
                    "conversions" : int  — conversions observed
    prior_alpha : float — alpha of the Beta prior (default 1 → uniform)
    prior_beta  : float — beta  of the Beta prior (default 1 → uniform)
    n_samples   : int   — Monte Carlo draws per variant (default 10,000)

    Returns
    -------
    dict with keys:
      "variants"            : list of per-variant result dicts (see below)
      "winner"              : name of the variant with the highest P(best)
      "winner_prob_best"    : that probability
      "winner_expected_loss": expected loss of the declared winner
    """

    n   = len(variants)
    rng = np.random.default_rng(seed=seed)

    # ── STEP 1: Compute posterior parameters ───────────────────────────────────
    #
    # Beta-Binomial conjugate update:
    #   Prior:     Beta(α₀, β₀)
    #   Data:      k conversions out of n visitors
    #   Posterior: Beta(α₀ + k, β₀ + n − k)
    #
    # α counts "successes", β counts "failures" — we just add observations.

    post_params = []
    for v in variants:
        alpha = prior_alpha + v["conversions"]
        beta  = prior_beta  + v["visitors"] - v["conversions"]
        post_params.append((float(alpha), float(beta)))

    # ── STEP 2: Monte Carlo samples — shape (n_variants, n_samples) ───────────
    #
    # Each row is one variant's distribution of plausible conversion rates.
    # Each column is one "possible world" — a simultaneous draw from all
    # posteriors. Comparing across rows within a column tells us which variant
    # wins *in that world*.

    all_samples = np.vstack([
        stats.beta.rvs(alpha, beta, size=n_samples, random_state=rng)
        for alpha, beta in post_params
    ])  # shape: (n_variants, n_samples)

    # ── STEP 3: Probability of being best ─────────────────────────────────────
    #
    # For each of the n_samples worlds, argmax gives the index of the variant
    # with the highest conversion rate in that world.
    #
    # prob_best[i] = fraction of worlds where variant i had the highest rate.
    #
    # This replaces the two-variant "P(B > A)" with a metric that scales to any
    # number of variants without double-counting or requiring pairwise tests.

    best_idx  = np.argmax(all_samples, axis=0)           # shape: (n_samples,)
    prob_best = np.array([np.mean(best_idx == i) for i in range(n)])

    # ── STEP 4: Expected loss ──────────────────────────────────────────────────
    #
    # The opportunity cost of picking variant i right now:
    #   expected_loss[i] = E[max(θ_best − θ_i, 0)]
    #
    # "On average, how much conversion rate do I leave on the table compared
    # with the true best variant, if I declare i the winner today?"
    #
    # Smaller loss → safer to stop and ship.  A common threshold is 0.005
    # (0.5 percentage points).

    best_samples  = np.max(all_samples, axis=0)          # shape: (n_samples,)
    expected_loss = np.array([
        float(np.mean(np.maximum(best_samples - all_samples[i], 0)))
        for i in range(n)
    ])

    # ── STEP 5: Posterior means and 95% credible intervals ────────────────────

    posterior_means = [alpha / (alpha + beta) for alpha, beta in post_params]
    credible_intervals = [
        (
            float(stats.beta.ppf(0.025, alpha, beta)),
            float(stats.beta.ppf(0.975, alpha, beta)),
        )
        for alpha, beta in post_params
    ]

    # ── STEP 6: Declare the winner ────────────────────────────────────────────
    #
    # The variant with the highest P(best) is the current leader.
    # The stopping rule checks whether *its* expected loss is below the
    # configured threshold — if so, it's safe to ship.

    winner_idx = int(np.argmax(prob_best))

    # ── Assemble per-variant dicts ────────────────────────────────────────────

    variant_results = []
    for i, v in enumerate(variants):
        alpha, beta = post_params[i]
        variant_results.append({
            "name": v["name"],
            "posterior_params": {"alpha": alpha, "beta": beta},
            "posterior_mean":   float(posterior_means[i]),
            "credible_interval": credible_intervals[i],
            "prob_best":         float(prob_best[i]),
            "expected_loss":     float(expected_loss[i]),
        })

    return {
        "variants":             variant_results,
        "winner":               variants[winner_idx]["name"],
        "winner_prob_best":     float(prob_best[winner_idx]),
        "winner_expected_loss": float(expected_loss[winner_idx]),
    }


def estimate_sample_size(
    baseline_rate,
    minimum_lift,
    confidence_threshold=0.95,
    power=0.80,
    seed=None,
):
    treatment_rate = baseline_rate + minimum_lift
    N_MIN, N_MAX, N_SIMS, N_MC = 100, 200_000, 2_000, 500

    _cache: dict[int, float] = {}

    def power_at(n: int) -> float:
        if n in _cache:
            return _cache[n]
        # Per-N deterministic seeding keeps binary search stable across repeated evals.
        sub_seed = None if seed is None else (seed * 1_000_003 + n) % (2 ** 31)
        rng = np.random.default_rng(sub_seed)

        # Simulate N_SIMS experiments: draw conversion counts from binomials
        ctrl_conv = rng.binomial(n, baseline_rate, size=N_SIMS)  # (N_SIMS,)
        trt_conv  = rng.binomial(n, treatment_rate, size=N_SIMS) # (N_SIMS,)

        # Posterior parameters for all sims at once (Beta-Binomial conjugate update)
        a_ctrl = 1.0 + ctrl_conv        # (N_SIMS,)
        b_ctrl = 1.0 + n - ctrl_conv    # (N_SIMS,)
        a_trt  = 1.0 + trt_conv         # (N_SIMS,)
        b_trt  = 1.0 + n - trt_conv     # (N_SIMS,)

        # Sample N_MC draws from each posterior for every sim simultaneously.
        # Shape: (N_SIMS, N_MC) — rows are experiments, columns are MC draws.
        ctrl_samples = rng.beta(a_ctrl[:, None], b_ctrl[:, None], size=(N_SIMS, N_MC))
        trt_samples  = rng.beta(a_trt[:, None],  b_trt[:, None],  size=(N_SIMS, N_MC))

        # prob_best(treatment) per sim = fraction of MC draws where trt > ctrl.
        # For two variants this is equivalent to argmax == treatment_idx.
        trt_prob_best = np.mean(trt_samples > ctrl_samples, axis=1)  # (N_SIMS,)

        # Power = fraction of sims where treatment clears the confidence threshold
        _cache[n] = float(np.mean(trt_prob_best >= confidence_threshold))
        return _cache[n]

    cap_power = power_at(N_MAX)
    if cap_power < power:
        return {
            "sample_size_per_variant": N_MAX,
            "total_sample_size":       N_MAX * 2,
            "power_achieved":          round(cap_power, 4),
            "feasible":                False,
            "power_curve":             [],
        }

    lo, hi = N_MIN, N_MAX
    while lo < hi:
        mid = (lo + hi) // 2
        if power_at(mid) >= power:
            hi = mid
        else:
            lo = mid + 1

    # Extend the cache to just past the recommended N so the chart curves beyond it.
    for extra_n in [min(N_MAX, round(lo * 1.25)), min(N_MAX, round(lo * 1.5))]:
        power_at(extra_n)

    x_max = min(N_MAX, round(lo * 1.5))
    curve = sorted(
        [{"sample_size": n, "power": round(p, 4)} for n, p in _cache.items() if n <= x_max],
        key=lambda d: d["sample_size"],
    )

    return {
        "sample_size_per_variant": lo,
        "total_sample_size":       lo * 2,
        "power_achieved":          round(power_at(lo), 4),
        "feasible":                True,
        "power_curve":             curve,
    }


def print_report(results, threshold=0.005):
    """Print a human-readable summary of analyze_ab_test() results."""
    variants    = results["variants"]
    winner_name = results["winner"]
    winner_loss = results["winner_expected_loss"]
    winner_prob = results["winner_prob_best"]

    sep  = "=" * 52
    thin = "-" * 52

    def pct(v):
        return f"{v * 100:.2f}%"

    print(f"\n{sep}")
    print("  BAYESIAN A/B TEST REPORT")
    print(sep)

    for v in variants:
        lo, hi = v["credible_interval"]
        alpha  = v["posterior_params"]["alpha"]
        beta   = v["posterior_params"]["beta"]
        print(f"\n  Variant {v['name']}")
        print(thin)
        print(f"  Posterior parameters : alpha={alpha:.0f}, beta={beta:.0f}")
        print(f"  Posterior mean       : {pct(v['posterior_mean'])}")
        print(f"  95% credible interval: [{pct(lo)}, {pct(hi)}]")
        print(f"  P(this is best)      : {v['prob_best'] * 100:.1f}%")
        print(f"  Expected loss        : {pct(v['expected_loss'])}")

    print(f"\n  RECOMMENDATION  (threshold = {pct(threshold)})")
    print(thin)

    if winner_loss < threshold:
        print(f"  STOP — declare Variant {winner_name} the winner.")
        print(f"  P(best) = {winner_prob * 100:.1f}%  |  Expected loss = {pct(winner_loss)}")
        print(f"  (below the {pct(threshold)} threshold)")
    else:
        print(f"  KEEP TESTING — not enough certainty to stop.")
        print(f"  Leaning toward Variant {winner_name} (P(best) = {winner_prob * 100:.1f}%)")
        for v in variants:
            print(f"  Expected loss {v['name']}: {pct(v['expected_loss'])}")
        print(f"  All exceed the {pct(threshold)} stopping threshold.")

    print(f"\n{sep}\n")

