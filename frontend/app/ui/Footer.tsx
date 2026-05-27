interface FooterLink {
  label: string;
  href:  string;
}

interface Props {
  resources: FooterLink[];
}

export default function Footer({ resources }: Props) {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

          {/* Col 1 — Brand */}
          <div>
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

          {/* Col 2 — Resources (caller-supplied so each page can link to what makes sense) */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Resources
            </p>
            <ul className="mt-3 space-y-2.5">
              {resources.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — About */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              About
            </p>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: 'Built by Tyler Greenwell', href: 'https://linkedin.com/in/tylergreenwell' },
                { label: 'Source code',              href: 'https://github.com/Tylerr175/Bayesian-ab-testing-dashboard' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

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
