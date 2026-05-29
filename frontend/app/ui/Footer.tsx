// Self-contained — all links are hardcoded here so both pages share one footer.

const GITHUB_REPO = 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard';
const GITHUB_PROFILE = 'https://github.com/Tylerr175';
const LINKEDIN = 'https://linkedin.com/in/tylergreenwell';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Learn',
    links: [
      { label: 'How it works', href: '/#explainer' },
      { label: 'Methodology', href: `${GITHUB_REPO}#methodology` },
      { label: 'Glossary', href: '#' },
    ],
  },
  {
    heading: 'Build',
    links: [
      { label: 'GitHub repo', href: GITHUB_REPO },
      { label: 'README', href: `${GITHUB_REPO}#readme` },
      { label: 'API documentation', href: '#' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { label: 'LinkedIn', href: LINKEDIN },
      { label: 'Email', href: 'mailto:tylergreenwell19@gmail.com' },
      { label: 'Resume', href: '/Resume.pdf' },
      { label: 'GitHub profile', href: GITHUB_PROFILE },
    ],
  },
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith('http') || href.endsWith('.pdf');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">

          {/* Col 1 — Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-inner">
                <span className="text-xs font-bold leading-none text-white">β</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-zinc-50">BayesLab</span>
            </div>
            <p className="mt-2.5 text-sm text-slate-500 dark:text-zinc-500">
              Bayesian inference for A/B testing
            </p>
          </div>

          {/* Cols 2–4 — Link columns */}
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                {heading}
              </p>
              <ul className="mt-3 space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <NavLink href={href}>{label}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-center dark:border-zinc-800">
          <p className="text-xs text-slate-400 dark:text-zinc-600">
            © 2026 Tyler Greenwell · Open source under the MIT license
          </p>
        </div>

      </div>
    </footer>
  );
}
