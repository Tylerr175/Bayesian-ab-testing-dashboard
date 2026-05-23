import numpy as np
from scipy import stats
import matplotlib.pyplot as plt


def analyze_ab_test(
    variants,
    prior_alpha=1,
    prior_beta=1,
    n_samples=10_000,
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
    rng = np.random.default_rng(seed=42)   # fixed seed → reproducible results

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


def plot_posteriors(results):
    """
    Plot posterior Beta distributions for all variants on one chart.
    Saves to posteriors.png and returns the path.

    Works for any number of variants, though the palette cycles after 6.
    """
    variants = results["variants"]

    PALETTE = ["#2B6CB0", "#C05621", "#276749", "#702459", "#744210", "#1A365D"]
    COLOR_GRID   = "#EBEBEB"
    COLOR_SPINE  = "#CCCCCC"
    COLOR_TEXT   = "#2D2D2D"
    COLOR_SUBTEXT = "#777777"

    # x-axis range: tight around the 0.1%–99.9% quantiles of all distributions
    lo_vals, hi_vals = [], []
    for v in variants:
        a, b = v["posterior_params"]["alpha"], v["posterior_params"]["beta"]
        lo_vals.append(stats.beta.ppf(0.001, a, b))
        hi_vals.append(stats.beta.ppf(0.999, a, b))

    x_lo = max(0.0, min(lo_vals))
    x_hi = min(1.0, max(hi_vals))
    pad  = (x_hi - x_lo) * 0.08
    x    = np.linspace(max(0.0, x_lo - pad), min(1.0, x_hi + pad), 2000)

    fig, ax = plt.subplots(figsize=(11, 5.5))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(COLOR_SPINE)
        ax.spines[spine].set_linewidth(0.8)

    ax.tick_params(colors=COLOR_SUBTEXT, labelsize=10)
    ax.yaxis.grid(True, color=COLOR_GRID, linewidth=0.9, zorder=0)
    ax.set_axisbelow(True)

    for i, v in enumerate(variants):
        color = PALETTE[i % len(PALETTE)]
        a, b  = v["posterior_params"]["alpha"], v["posterior_params"]["beta"]
        pdf   = stats.beta.pdf(x, a, b)
        mean  = v["posterior_mean"]
        lo, hi = v["credible_interval"]

        ax.plot(x, pdf, color=color, linewidth=2.5, zorder=3,
                label=f"Variant {v['name']} — mean {mean * 100:.2f}%")
        ax.fill_between(x, 0, pdf,
                        where=(x >= lo) & (x <= hi),
                        color=color, alpha=0.15, zorder=2)
        ax.axvline(mean, color=color, linewidth=1.5, linestyle="--", alpha=0.85, zorder=3)

    ax.set_xlabel("Conversion Rate", fontsize=12, color=COLOR_TEXT, labelpad=8)
    ax.set_ylabel("Posterior Density", fontsize=12, color=COLOR_TEXT, labelpad=8)
    ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v * 100:.1f}%"))
    ax.set_ylim(bottom=0)

    fig.suptitle("Posterior Conversion Rate Distributions",
                 fontsize=15, fontweight="bold", color=COLOR_TEXT, y=1.01)

    legend = ax.legend(fontsize=10, frameon=True, framealpha=0.95,
                       edgecolor=COLOR_SPINE, loc="upper center",
                       bbox_to_anchor=(0.5, -0.13), ncol=2, handlelength=1.6)
    legend.get_frame().set_linewidth(0.8)

    output_path = "posteriors.png"
    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return output_path


def main():
    pass


if __name__ == "__main__":
    main()
