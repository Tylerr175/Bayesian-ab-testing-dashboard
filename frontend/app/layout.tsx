import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BayesLab — Bayesian A/B Testing Analysis",
  description: "Get probability-based decisions, credible intervals, and expected-loss stopping rules — without p-values.",
  twitter: {
    card: "summary_large_image",
    title: "BayesLab — Bayesian A/B Testing Analysis",
    description: "Get probability-based decisions, credible intervals, and expected-loss stopping rules — without p-values.",
  },
};

// Purely decorative background — a single S-curve that flows from the
// bottom-left corner through the viewport centre to the top-right, tying
// the visual identity to the Bayesian domain without cluttering the UI.
// Rendered as a server component (no JS), fixed behind all content.
function BetaCurveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.12 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient follows the curve direction: bottom-left → top-right */}
          <linearGradient id="bgCurve" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/*
          S-curve: starts off-screen bottom-left, arcs to upper half,
          passes through the viewport centre, then arcs back down and
          sweeps up to off-screen top-right.
        */}
        <path
          d="M -60 920 C 200 920 480 -60 720 460 C 960 980 1240 -60 1500 -60"
          fill="none"
          stroke="url(#bgCurve)"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.className} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Anti-FOUC: runs synchronously before first paint.
          Reads localStorage or system preference and adds .dark to <html>
          so CSS dark: classes are correct before React hydrates.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&p))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950">
        <BetaCurveBackground />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
