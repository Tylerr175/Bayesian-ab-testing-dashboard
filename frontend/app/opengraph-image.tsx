import { ImageResponse } from 'next/og';

export const alt = 'BayesLab — Bayesian A/B Testing Analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: '#09090b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient top strip */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
          }}
        />

        {/* Decorative posterior curves */}
        <svg
          style={{ position: 'absolute', top: -60, right: -60, width: 680, height: 500, opacity: 0.09 }}
          viewBox="0 0 680 500"
        >
          <defs>
            <linearGradient id="ogA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <path
            d="M 0 460 C 90 448 220 60 370 32 C 520 4 600 420 680 460"
            fill="none"
            stroke="url(#ogA)"
            strokeWidth="3"
          />
        </svg>

        <svg
          style={{ position: 'absolute', bottom: -60, left: -60, width: 580, height: 400, opacity: 0.07 }}
          viewBox="0 0 580 400"
        >
          <defs>
            <linearGradient id="ogB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="M 0 360 C 70 348 160 60 300 38 C 440 16 510 336 580 360"
            fill="none"
            stroke="url(#ogB)"
            strokeWidth="2.5"
          />
        </svg>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '68px 80px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)',
                borderRadius: 12,
              }}
            >
              <span style={{ color: 'white', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>β</span>
            </div>
            <span style={{ color: '#f4f4f5', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
              BayesLab
            </span>
          </div>

          {/* Headline + tagline pushed to bottom */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-2.5px',
                lineHeight: 1.05,
              }}
            >
              Bayesian A/B Testing
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#71717a',
                lineHeight: 1.5,
                maxWidth: 740,
              }}
            >
              Probability-based decisions, credible intervals, and expected-loss
              stopping rules — without p-values.
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
