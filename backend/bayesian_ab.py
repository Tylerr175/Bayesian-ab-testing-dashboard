import numpy as np
from scipy import stats
import matplotlib.pyplot as plt


def analyze_ab_test(
    a_visitors,
    a_conversions,
    b_visitors,
    b_conversions,
    prior_alpha=1,
    prior_beta=1,
    n_samples=10_000,
):
    """
    Bayesian A/B test analysis using a Beta-Binomial conjugate model.

    The core idea: we don't know the "true" conversion rate for each variant —
    it's uncertain. Instead of a single number, Bayesian inference gives us a
    full probability distribution over all the rates that are consistent with
    what we observed. That distribution is called the *posterior*.

    We use the Beta distribution to represent our belief about a conversion
    rate, because:
      - A rate must live between 0 and 1 (Beta does that).
      - When your data is Binomial (successes out of trials), the Beta
        distribution is the *conjugate prior*, meaning the posterior is also
        a Beta — the math works out to a clean closed-form update rule.

    Parameters
    ----------
    a_visitors     : int   — total visitors shown variant A
    a_conversions  : int   — visitors from A who converted
    b_visitors     : int   — total visitors shown variant B
    b_conversions  : int   — visitors from B who converted
    prior_alpha    : float — alpha parameter of the Beta prior (default 1)
    prior_beta     : float — beta parameter of the Beta prior (default 1)
                             Beta(1, 1) is the *uniform* prior — it says
                             "before seeing any data, every conversion rate
                             between 0 and 1 is equally plausible."
    n_samples      : int   — how many Monte Carlo samples to draw from each
                             posterior (more = more precise estimates)

    Returns
    -------
    dict with keys described inline below.
    """

    # ------------------------------------------------------------------
    # STEP 1: Update the prior with observed data to get the posterior.
    #
    # The Beta-Binomial update rule is beautifully simple:
    #
    #   Prior:     Beta(alpha,       beta)
    #   Data:      k conversions out of n visitors
    #   Posterior: Beta(alpha + k,   beta + (n - k))
    #
    # Intuitively: alpha counts "successes" and beta counts "failures".
    # We just add what we observed on top of what we believed before.
    # ------------------------------------------------------------------

    # Non-conversions = visitors who did NOT convert
    a_non_conversions = a_visitors - a_conversions
    b_non_conversions = b_visitors - b_conversions

    # Posterior parameters for variant A
    alpha_post_a = prior_alpha + a_conversions   # prior belief + observed successes
    beta_post_a  = prior_beta  + a_non_conversions  # prior belief + observed failures

    # Posterior parameters for variant B
    alpha_post_b = prior_alpha + b_conversions
    beta_post_b  = prior_beta  + b_non_conversions

    # ------------------------------------------------------------------
    # STEP 2: Draw samples from each posterior.
    #
    # scipy.stats.beta.rvs(a, b, size=N) draws N random conversion rates
    # that are consistent with the posterior Beta(a, b).
    #
    # Think of each sample as one "plausible world" — a scenario where
    # variant A's true rate is a_samples[i] and B's true rate is
    # b_samples[i]. By drawing 10,000 of these worlds we can answer
    # probabilistic questions just by counting.
    # ------------------------------------------------------------------

    rng = np.random.default_rng(seed=42)  # fixed seed → reproducible results

    a_samples = stats.beta.rvs(alpha_post_a, beta_post_a, size=n_samples, random_state=rng)
    b_samples = stats.beta.rvs(alpha_post_b, beta_post_b, size=n_samples, random_state=rng)

    # ------------------------------------------------------------------
    # STEP 3: Posterior means.
    #
    # The mean of a Beta(alpha, beta) distribution is:
    #   alpha / (alpha + beta)
    #
    # This is our best single-number estimate of the true conversion rate.
    # ------------------------------------------------------------------

    mean_a = alpha_post_a / (alpha_post_a + beta_post_a)
    mean_b = alpha_post_b / (alpha_post_b + beta_post_b)

    # ------------------------------------------------------------------
    # STEP 4: 95% credible intervals for each rate.
    #
    # A credible interval is the Bayesian answer to: "where does the true
    # rate probably live?" A 95% credible interval [lo, hi] means:
    #   "Given the data, there is a 95% probability the true rate is
    #    between lo and hi."
    #
    # We get the interval boundaries from the Beta distribution's percent-
    # point function (ppf) — the inverse of the CDF.
    #   ppf(0.025) → the value below which 2.5% of probability mass sits
    #   ppf(0.975) → the value below which 97.5% sits
    # The 95% of mass between those two points is our credible interval.
    # ------------------------------------------------------------------

    ci_a = (
        stats.beta.ppf(0.025, alpha_post_a, beta_post_a),
        stats.beta.ppf(0.975, alpha_post_a, beta_post_a),
    )
    ci_b = (
        stats.beta.ppf(0.025, alpha_post_b, beta_post_b),
        stats.beta.ppf(0.975, alpha_post_b, beta_post_b),
    )

    # ------------------------------------------------------------------
    # STEP 5: P(B > A) — probability that B's true rate exceeds A's.
    #
    # This is why we drew samples: we can answer this question by simply
    # counting the fraction of "plausible worlds" where B beat A.
    # No complicated formula needed — just a comparison across samples.
    # ------------------------------------------------------------------

    prob_b_better = np.mean(b_samples > a_samples)

    # ------------------------------------------------------------------
    # STEP 6: 95% credible interval for the lift (B − A).
    #
    # Lift = how much better (or worse) B is than A in absolute terms.
    # We compute it for every sampled world, then take the 2.5th and
    # 97.5th percentiles to form the credible interval.
    #
    # A lift CI that doesn't include 0 is strong evidence of a real
    # difference. A CI that straddles 0 means we're uncertain which
    # variant is better.
    # ------------------------------------------------------------------

    lift_samples = b_samples - a_samples
    ci_lift = (
        float(np.percentile(lift_samples, 2.5)),
        float(np.percentile(lift_samples, 97.5)),
    )

    # ------------------------------------------------------------------
    # STEP 7: Expected loss for each variant.
    #
    # "If I declare this variant the winner right now and stop the test,
    #  how much conversion rate am I expected to give up?"
    #
    # Expected loss of choosing A =
    #   average amount by which B beats A, in worlds where B actually wins.
    #   = E[max(θ_B − θ_A, 0)]
    #
    # Expected loss of choosing B =
    #   average amount by which A beats B, in worlds where A actually wins.
    #   = E[max(θ_A − θ_B, 0)]
    #
    # np.maximum(x, 0) zeroes out negative differences (i.e., the worlds
    # where the chosen variant was actually right don't contribute to loss).
    #
    # Smaller expected loss → safer pick. Many teams stop the test when
    # the winner's expected loss drops below a small threshold (e.g. 0.001).
    # ------------------------------------------------------------------

    expected_loss_a = float(np.mean(np.maximum(b_samples - a_samples, 0)))
    expected_loss_b = float(np.mean(np.maximum(a_samples - b_samples, 0)))

    # ------------------------------------------------------------------
    # Assemble and return all results.
    # ------------------------------------------------------------------

    return {
        # Raw posterior parameters (useful for further computation or plotting)
        "posterior_params": {
            "a": {"alpha": alpha_post_a, "beta": beta_post_a},
            "b": {"alpha": alpha_post_b, "beta": beta_post_b},
        },
        # Best single-number estimate of each variant's true conversion rate
        "posterior_means": {"a": mean_a, "b": mean_b},
        # Where the true rate probably lives (95% probability)
        "credible_intervals": {"a": ci_a, "b": ci_b},
        # Probability that B's true conversion rate is higher than A's
        "prob_b_better": float(prob_b_better),
        # How much better/worse B is than A, with uncertainty
        "lift_ci": ci_lift,
        # Cost of declaring a winner prematurely — lower is safer
        "expected_loss": {"a": expected_loss_a, "b": expected_loss_b},
    }


def print_report(results, threshold=0.005):
    """
    Print a human-readable summary of analyze_ab_test() results.

    Parameters
    ----------
    results   : dict — return value of analyze_ab_test()
    threshold : float — expected loss below which it is safe to stop the test
                        and declare a winner (default 0.005 = 0.5 pp)
    """
    means   = results["posterior_means"]
    cis     = results["credible_intervals"]
    params  = results["posterior_params"]
    loss    = results["expected_loss"]
    lift_lo, lift_hi = results["lift_ci"]

    sep   = "=" * 52
    thin  = "-" * 52

    def pct(v):
        return f"{v * 100:.2f}%"

    def pct_ci(lo, hi):
        return f"[{pct(lo)}, {pct(hi)}]"

    print(f"\n{sep}")
    print("  BAYESIAN A/B TEST REPORT")
    print(sep)

    # -- Per-variant sections ------------------------------------------
    for label in ("a", "b"):
        name = f"Variant {label.upper()}"
        alpha = params[label]["alpha"]
        beta  = params[label]["beta"]
        lo, hi = cis[label]

        print(f"\n  {name}")
        print(thin)
        print(f"  Posterior parameters : alpha={alpha}, beta={beta}")
        print(f"  Posterior mean       : {pct(means[label])}")
        print(f"  95% credible interval: {pct_ci(lo, hi)}")
        print(f"  Expected loss        : {pct(loss[label])}")

    # -- Comparison section --------------------------------------------
    print(f"\n  COMPARISON")
    print(thin)
    print(f"  P(B > A)             : {results['prob_b_better'] * 100:.1f}%")
    print(f"  Lift 95% CI (B - A)  : {pct_ci(lift_lo, lift_hi)}")

    mean_lift = means["b"] - means["a"]
    lift_sign = "+" if mean_lift >= 0 else ""
    print(f"  Expected lift        : {lift_sign}{pct(mean_lift)}")

    # -- Recommendation ------------------------------------------------
    print(f"\n  RECOMMENDATION  (threshold = {pct(threshold)})")
    print(thin)

    loss_a = loss["a"]
    loss_b = loss["b"]

    # The "winning" variant is whichever has lower expected loss.
    # We only declare it the winner if its loss is below the threshold.
    if loss_a <= loss_b:
        winner, winner_loss, loser = "A", loss_a, "B"
    else:
        winner, winner_loss, loser = "B", loss_b, "A"

    if winner_loss < threshold:
        print(f"  STOP THE TEST — declare Variant {winner} the winner.")
        print(f"  Expected loss of choosing {winner}: {pct(winner_loss)}")
        print(f"  (below the {pct(threshold)} threshold)")
    else:
        # Neither variant is decisively safe to pick yet.
        print(f"  KEEP TESTING — not enough certainty to stop.")
        print(f"  Expected loss  A: {pct(loss_a)}")
        print(f"  Expected loss  B: {pct(loss_b)}")
        print(f"  Both exceed the {pct(threshold)} stopping threshold.")
        print(f"  Leaning toward Variant {winner} but more data needed.")

    print(f"\n{sep}\n")


def plot_posteriors(results, a_visitors, a_conversions, b_visitors, b_conversions):
    """
    Plot both posterior Beta distributions on one chart with shaded 95%
    credible intervals, mean markers, and a stats annotation box.
    Saves the figure to posteriors.png and returns the file path.
    """
    params = results["posterior_params"]
    means  = results["posterior_means"]
    cis    = results["credible_intervals"]

    alpha_a, beta_a = params["a"]["alpha"], params["a"]["beta"]
    alpha_b, beta_b = params["b"]["alpha"], params["b"]["beta"]

    # ── Palette & style constants ──────────────────────────────────────
    COLOR_A      = "#2B6CB0"   # slate blue
    COLOR_B      = "#C05621"   # burnt orange
    COLOR_GRID   = "#EBEBEB"
    COLOR_SPINE  = "#CCCCCC"
    COLOR_TEXT   = "#2D2D2D"
    COLOR_SUBTEXT = "#777777"

    # ── x-axis range: tight around the 0.1%–99.9% quantiles of both dists
    x_lo = max(0.0, min(
        stats.beta.ppf(0.001, alpha_a, beta_a),
        stats.beta.ppf(0.001, alpha_b, beta_b),
    ))
    x_hi = min(1.0, max(
        stats.beta.ppf(0.999, alpha_a, beta_a),
        stats.beta.ppf(0.999, alpha_b, beta_b),
    ))
    pad  = (x_hi - x_lo) * 0.08
    x    = np.linspace(max(0.0, x_lo - pad), min(1.0, x_hi + pad), 2000)

    pdf_a = stats.beta.pdf(x, alpha_a, beta_a)
    pdf_b = stats.beta.pdf(x, alpha_b, beta_b)

    # ── Figure setup ───────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(11, 5.5))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # Minimal spine style
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(COLOR_SPINE)
        ax.spines[spine].set_linewidth(0.8)

    ax.tick_params(colors=COLOR_SUBTEXT, labelsize=10)
    ax.yaxis.grid(True, color=COLOR_GRID, linewidth=0.9, zorder=0)
    ax.set_axisbelow(True)

    # ── Main PDF curves ────────────────────────────────────────────────
    ax.plot(x, pdf_a, color=COLOR_A, linewidth=2.5, zorder=3,
            label=f"Variant A — mean {means['a']*100:.2f}%")
    ax.plot(x, pdf_b, color=COLOR_B, linewidth=2.5, zorder=3,
            label=f"Variant B — mean {means['b']*100:.2f}%")

    # ── Shaded 95% credible intervals ─────────────────────────────────
    ci_a_lo, ci_a_hi = cis["a"]
    ci_b_lo, ci_b_hi = cis["b"]

    ax.fill_between(x, 0, pdf_a,
                    where=(x >= ci_a_lo) & (x <= ci_a_hi),
                    color=COLOR_A, alpha=0.15, zorder=2,
                    label=f"A  95% CI  [{ci_a_lo*100:.2f}%, {ci_a_hi*100:.2f}%]")
    ax.fill_between(x, 0, pdf_b,
                    where=(x >= ci_b_lo) & (x <= ci_b_hi),
                    color=COLOR_B, alpha=0.15, zorder=2,
                    label=f"B  95% CI  [{ci_b_lo*100:.2f}%, {ci_b_hi*100:.2f}%]")

    # Thin vertical ticks at CI boundaries so the interval is crisp
    y_top = ax.get_ylim()[1]
    for bound in (ci_a_lo, ci_a_hi):
        ax.axvline(bound, color=COLOR_A, linewidth=0.8, linestyle=":", alpha=0.7, zorder=2)
    for bound in (ci_b_lo, ci_b_hi):
        ax.axvline(bound, color=COLOR_B, linewidth=0.8, linestyle=":", alpha=0.7, zorder=2)

    # ── Posterior mean markers ─────────────────────────────────────────
    ax.axvline(means["a"], color=COLOR_A, linewidth=1.5, linestyle="--", alpha=0.85, zorder=3)
    ax.axvline(means["b"], color=COLOR_B, linewidth=1.5, linestyle="--", alpha=0.85, zorder=3)

    # ── Stats annotation box (top-right or top-left based on which side is
    #    less crowded — place it opposite the taller peak) ──────────────
    peak_x_a = (alpha_a - 1) / (alpha_a + beta_a - 2) if (alpha_a + beta_a) > 2 else means["a"]
    peak_x_b = (alpha_b - 1) / (alpha_b + beta_b - 2) if (alpha_b + beta_b) > 2 else means["b"]
    # If both peaks are in the right half of the plot, anchor the box left
    plot_mid  = (x[0] + x[-1]) / 2
    box_loc   = "upper left" if max(peak_x_a, peak_x_b) > plot_mid else "upper right"

    lift_lo, lift_hi = results["lift_ci"]
    prob_b  = results["prob_b_better"]
    loss_a  = results["expected_loss"]["a"]
    loss_b  = results["expected_loss"]["b"]
    annotation = (
        f"P(B > A)       {prob_b*100:.1f}%\n"
        f"Lift 95% CI  [{lift_lo*100:+.2f}%, {lift_hi*100:+.2f}%]\n"
        f"E[loss A]     {loss_a*100:.3f}%\n"
        f"E[loss B]     {loss_b*100:.3f}%"
    )
    ax.annotate(
        annotation,
        xy=(0.02 if box_loc == "upper left" else 0.98, 0.97),
        xycoords="axes fraction",
        va="top",
        ha="left" if box_loc == "upper left" else "right",
        fontsize=9.5,
        color=COLOR_TEXT,
        fontfamily="monospace",
        bbox=dict(
            boxstyle="round,pad=0.5",
            facecolor="white",
            edgecolor=COLOR_SPINE,
            linewidth=0.8,
            alpha=0.92,
        ),
        zorder=5,
    )

    # ── Axes labels & titles ───────────────────────────────────────────
    ax.set_xlabel("Conversion Rate", fontsize=12, color=COLOR_TEXT, labelpad=8)
    ax.set_ylabel("Posterior Density", fontsize=12, color=COLOR_TEXT, labelpad=8)
    ax.xaxis.set_major_formatter(
        plt.FuncFormatter(lambda v, _: f"{v * 100:.1f}%")
    )
    ax.set_ylim(bottom=0)

    fig.suptitle(
        "Posterior Conversion Rate Distributions",
        fontsize=15, fontweight="bold", color=COLOR_TEXT, y=1.01,
    )
    ax.set_title(
        f"Variant A: {a_conversions:,} / {a_visitors:,} conversions"
        f"   ·   "
        f"Variant B: {b_conversions:,} / {b_visitors:,} conversions",
        fontsize=10.5, color=COLOR_SUBTEXT, pad=6,
    )

    # ── Legend ─────────────────────────────────────────────────────────
    legend = ax.legend(
        fontsize=10,
        frameon=True,
        framealpha=0.95,
        edgecolor=COLOR_SPINE,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.13),
        ncol=2,
        handlelength=1.6,
    )
    legend.get_frame().set_linewidth(0.8)

    # ── Save ───────────────────────────────────────────────────────────
    output_path = "/Users/tylergreenwell/Bayesian A:B Testing Dashboard/posteriors.png"
    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    return output_path


def main():
    pass


if __name__ == "__main__":
    main()
