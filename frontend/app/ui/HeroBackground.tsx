'use client';

import { useEffect, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const W                   = 1200;
const H                   = 700;
const N                   = 101;
const DURATION            = 18_000;
const MAX_CURSOR_DISTANCE = 400;
const MAX_Y_SHIFT         = 25;    // SVG user units; converted to CSS px in tick

// ── x sample positions (0,1) exclusive ────────────────────────────────────────

const X_VALS = Float32Array.from({ length: N }, (_, i) => 0.005 + (i / (N - 1)) * 0.990);

// ── Curve definitions ─────────────────────────────────────────────────────────

const RAW_CURVES: Array<{
  keyframes: [number, number][];
  color: string;
  yBaseline: number;
  amplitude: number;
  xOff: number;
  xRange: number;
  stagger: number;
}> = [
  { keyframes: [[2,5],[5,2],[3,8],[8,3],[4,4]], color: '#6366f1', yBaseline: 720, amplitude: 380, xOff:  -50, xRange: 1300, stagger: 0 / 8 },
  { keyframes: [[5,2],[2,5],[7,2],[3,3],[6,6]], color: '#818cf8', yBaseline: 740, amplitude: 340, xOff:   40, xRange: 1160, stagger: 1 / 8 },
  { keyframes: [[3,3],[8,2],[2,8],[5,5],[4,3]], color: '#6366f1', yBaseline: 760, amplitude: 460, xOff:  -30, xRange: 1260, stagger: 2 / 8 },
  { keyframes: [[8,3],[3,8],[5,5],[2,3],[6,4]], color: '#4f46e5', yBaseline: 700, amplitude: 300, xOff:   70, xRange: 1200, stagger: 3 / 8 },
  { keyframes: [[2,8],[8,2],[4,4],[5,8],[3,2]], color: '#8b5cf6', yBaseline: 750, amplitude: 360, xOff:  -70, xRange: 1340, stagger: 4 / 8 },
  { keyframes: [[4,4],[2,6],[6,2],[8,8],[3,5]], color: '#6366f1', yBaseline: 730, amplitude: 420, xOff:   10, xRange: 1180, stagger: 5 / 8 },
  { keyframes: [[6,2],[2,6],[4,4],[7,3],[3,7]], color: '#818cf8', yBaseline: 710, amplitude: 320, xOff:  -10, xRange: 1220, stagger: 6 / 8 },
  { keyframes: [[3,6],[6,3],[2,2],[5,5],[4,7]], color: '#8b5cf6', yBaseline: 745, amplitude: 390, xOff:   50, xRange: 1150, stagger: 7 / 8 },
];

// ── Precompute all keyframe shapes at module load ─────────────────────────────
// Eliminates Math.exp / Math.log from the hot rAF path entirely.

function computeNormalizedPDF(alpha: number, beta: number): Float32Array {
  const out = new Float32Array(N);
  let max = 0;
  for (let i = 0; i < N; i++) {
    const x = X_VALS[i];
    const v = Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x));
    out[i] = v;
    if (v > max) max = v;
  }
  if (max > 0) for (let i = 0; i < N; i++) out[i] /= max;
  return out;
}

const CURVES = RAW_CURVES.map((c, i) => ({
  color:     c.color,
  yBaseline: c.yBaseline,
  amplitude: c.amplitude,
  stagger:   c.stagger,
  homeX:     100 + (i / (RAW_CURVES.length - 1)) * 1000,
  svgX:      Float32Array.from(X_VALS, x => c.xOff + x * c.xRange),
  shapes:    c.keyframes.map(([a, b]) => computeNormalizedPDF(a, b)),
}));

// ── Pure helpers ──────────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

function buildPath(
  svgX: Float32Array,
  normalized: Float32Array,
  yBaseline: number,
  amplitude: number,
): string {
  const parts = new Array<string>(N);
  for (let i = 0; i < N; i++) {
    const x = svgX[i].toFixed(1);
    const y = (yBaseline - normalized[i] * amplitude).toFixed(1);
    parts[i] = i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }
  return parts.join(' ');
}

/**
 * Map a CSS-pixel cursor position to SVG user-unit coordinates,
 * correctly inverting the preserveAspectRatio="xMidYMid slice" transform.
 */
function cssToSvg(clientX: number, clientY: number, rect: DOMRect) {
  const scale = Math.max(rect.width / W, rect.height / H);
  return {
    x: (clientX - rect.left - (rect.width  - W * scale) / 2) / scale,
    y: (clientY - rect.top  - (rect.height - H * scale) / 2) / scale,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeroBackground() {
  const svgRef   = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    // Reduced-motion: the SVG JSX below renders the first Beta shape statically
    // (strokeOpacity 0.15, no animation, no mouse tracking).  The early return
    // here simply skips starting the rAF loop — the curves are still visible.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isTouchPrimary = window.matchMedia('(hover: none)').matches;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    // Re-capture as a non-nullable const so TypeScript preserves the type
    // inside nested function declarations (closures don't carry narrowing).
    const svg: SVGSVGElement = svgEl;

    const buf = new Float32Array(N); // shared per-frame interpolation buffer

    // ── Delta-based elapsed time ───────────────────────────────────────────
    // Using delta rather than (now - start) means pause/resume via
    // IntersectionObserver doesn't cause the animation to jump forward.
    let elapsed = 0;
    let lastNow = performance.now();

    // ── Per-curve smoothed values ──────────────────────────────────────────
    const states = CURVES.map(() => ({ opacity: 0.20, yShift: 0 }));
    const cursor = { svgX: 0, svgY: 0, active: false };

    // ── will-change hints (set once, removed on unmount) ──────────────────
    // opacity — for the scroll-fade applied to the SVG element each frame
    // transform — for the per-path CSS translateY applied by mouse effect
    svg.style.willChange = 'opacity';
    for (let i = 0; i < CURVES.length; i++) {
      pathRefs.current[i]?.style.setProperty('will-change', 'transform');
    }

    // ── rAF start / stop (controlled by IntersectionObserver) ─────────────
    let animating = false;

    function startTick() {
      if (animating) return;
      animating = true;
      lastNow = performance.now(); // prevent time-jump on resume
      rafRef.current = requestAnimationFrame(tick);
    }

    function stopTick() {
      animating = false;
      cancelAnimationFrame(rafRef.current);
    }

    // Pause the rAF loop whenever the hero is fully scrolled off-screen.
    // threshold:0 means "fire when even 1px is visible/invisible".
    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? startTick() : stopTick(); },
      { threshold: 0 },
    );
    observer.observe(svg);
    startTick(); // also kick off immediately — observer fires asynchronously

    // ── Mouse tracking ─────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = svg.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom
      ) {
        cursor.active = false;
        return;
      }
      const { x, y } = cssToSvg(e.clientX, e.clientY, rect);
      cursor.svgX = x;
      cursor.svgY = y;
      cursor.active = true;
    }

    function onDocMouseLeave() {
      cursor.active = false;
    }

    if (!isTouchPrimary) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onDocMouseLeave);
    }

    // ── rAF tick ───────────────────────────────────────────────────────────
    function tick(now: number) {
      elapsed += now - lastNow;
      lastNow = now;

      // ── getBoundingClientRect: one call per frame, used for both ─────
      // scroll-fade AND the CSS-pixel scale factor for y-shift.
      const rect  = svg.getBoundingClientRect();
      // scale: SVG user units → CSS pixels (mirrors the xMidYMid slice math)
      const scale = Math.max(rect.width / W, rect.height / H);

      // ── Scroll fade ───────────────────────────────────────────────────
      // rect.top < 0  →  hero has scrolled above the viewport top.
      // Fade from 1 (rect.top = 0) to 0 (rect.top = -heroHeight * 0.5).
      const scrollFade =
        rect.top >= 0
          ? 1
          : Math.max(0, 1 + rect.top / (rect.height * 0.5));
      svg.style.opacity = scrollFade.toFixed(3);

      // ── Per-curve morphing + mouse ────────────────────────────────────
      for (let i = 0; i < CURVES.length; i++) {
        const el    = pathRefs.current[i];
        if (!el) continue;

        const curve = CURVES[i];
        const state = states[i];

        // Morphing — interpolate between adjacent precomputed shapes
        const n = curve.shapes.length;
        if (n === 0) continue;

        // Normalised position [0,1) in cycle, offset by stagger, then
        // wrapped so it never escapes [0,1).
        const tRaw   = (elapsed % DURATION) / DURATION + curve.stagger;
        const t      = tRaw % 1;
        const segLen = 1 / n;

        // Double-clamp seg and segT to guard against float edge-cases
        // (e.g. elapsed % DURATION producing a value ε above DURATION).
        const seg     = Math.max(0, Math.min(Math.floor(t / segLen), n - 1));
        const rawSegT = Math.max(0, Math.min(1, (t - seg * segLen) / segLen));
        const segT    = easeInOut(rawSegT);

        const from = curve.shapes[seg];
        const to   = curve.shapes[(seg + 1) % n];
        if (!from || !to) continue;

        for (let j = 0; j < N; j++) {
          buf[j] = from[j] + (to[j] - from[j]) * segT;
        }
        el.setAttribute('d', buildPath(curve.svgX, buf, curve.yBaseline, curve.amplitude));

        // Mouse influence
        let targetOpacity = 0.20;
        let targetYShift  = 0;

        if (!isTouchPrimary && cursor.active) {
          const influence = Math.max(0, 1 - Math.abs(cursor.svgX - curve.homeX) / MAX_CURSOR_DISTANCE);
          if (influence > 0) {
            targetOpacity = 0.20 + influence * 0.2;
            targetYShift  = influence * MAX_Y_SHIFT * ((cursor.svgY / H) - 0.5) * 2;
          }
        }

        // Lerp: snappy when cursor active, ~800 ms return when inactive
        const lf = cursor.active ? 0.12 : 0.06;
        state.opacity += (targetOpacity - state.opacity) * lf;
        state.yShift  += (targetYShift  - state.yShift)  * lf;

        el.setAttribute('stroke-opacity', state.opacity.toFixed(3));

        // CSS translateY (not SVG transform attribute) so the browser can
        // GPU-composite this layer. Convert SVG units → CSS pixels via scale.
        el.style.transform = `translateY(${(state.yShift * scale).toFixed(2)}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      stopTick();
      observer.disconnect();
      if (!isTouchPrimary) {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onDocMouseLeave);
      }
      svg.style.willChange = '';
      svg.style.opacity    = '';
      for (let i = 0; i < CURVES.length; i++) {
        const el = pathRefs.current[i];
        if (!el) continue;
        el.style.willChange = '';
        el.style.transform  = '';
      }
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      {CURVES.map((c, i) => (
        <path
          key={i}
          ref={el => { pathRefs.current[i] = el; }}
          d={buildPath(c.svgX, c.shapes[0], c.yBaseline, c.amplitude)}
          stroke={c.color}
          strokeWidth={2}
          strokeOpacity={0.20}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </svg>
  );
}
