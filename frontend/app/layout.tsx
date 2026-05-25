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

// Purely decorative background — two posterior distribution curves that tie
// the visual identity to the Bayesian domain without cluttering the UI.
// Rendered as a server component (no JS), fixed behind all content.
function BetaCurveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {/* Top-right — narrow, well-identified posterior */}
      <svg
        style={{ position: "absolute", top: -60, right: -60, width: 620, height: 460, opacity: 0.07 }}
        viewBox="0 0 620 460"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgCurveA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <path
          d="M 0 420 C 80 410 200 60 330 30 C 460 0 540 380 620 420"
          fill="none"
          stroke="url(#bgCurveA)"
          strokeWidth="2.5"
        />
      </svg>

      {/* Bottom-left — wider, more diffuse prior */}
      <svg
        style={{ position: "absolute", bottom: -60, left: -60, width: 540, height: 360, opacity: 0.06 }}
        viewBox="0 0 540 360"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgCurveB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path
          d="M 0 320 C 60 310 140 60 270 40 C 400 20 470 300 540 320"
          fill="none"
          stroke="url(#bgCurveB)"
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
