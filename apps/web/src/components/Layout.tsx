import { NavLink } from 'react-router-dom';
import { useSessionStore } from '../lib/sessionStore';

type LayoutProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard' },
  { to: '/leads',       label: 'Leads'     },
  { to: '/quotations',  label: 'Quotations'},
  { to: '/projects',    label: 'Projects'  },
  { to: '/employees',   label: 'Employees' },
  { to: '/expenses',    label: 'Expenses'  },
];

const TICKER_TEXT =
  'SITE A: ACTIVE — CREW ALPHA DEPLOYED • SITE B: CONCRETE POUR COMPLETE • SITE C: ELECTRICAL PHASE UNDERWAY • NEW QUOTATION SUBMITTED • MATERIALS PROCUREMENT CONFIRMED • MILESTONE: STRUCTURAL STEEL SIGNED OFF • SYSTEM NOMINAL';

/** SiteCore wordmark — inline SVG hex-diamond mark + logotype */
function SiteCoreMark() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Geometric hexagon mark */}
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <polygon
          points="13,1 24,7 24,19 13,25 2,19 2,7"
          fill="#d97706"
          stroke="#f59e0b"
          strokeWidth="0.5"
        />
        <polygon
          points="13,6 20,10 20,16 13,20 6,16 6,10"
          fill="#0f0f0f"
          stroke="#d97706"
          strokeWidth="0.75"
        />
        <line x1="13" y1="10" x2="13" y2="16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="12" x2="16" y2="12" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <span className="block text-sm font-semibold tracking-tight text-sc-bright">SiteCore</span>
        <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-sc-muted mt-0.5">Construction CRM</span>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user, logoutUser } = useSessionStore();

  return (
    <div className="min-h-screen bg-sc-base text-sc-text flex flex-col">

      {/* ── Top Navigation ──────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-30 w-full border-b border-sc-border bg-sc-panel/95 backdrop-blur-md"
        style={{ height: '56px' }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5">

          {/* Brand */}
          <SiteCoreMark />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'relative px-4 py-[18px] text-sm font-medium transition-colors duration-150',
                    'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:transition-all after:duration-150',
                    isActive
                      ? 'text-sc-amber after:bg-sc-amber'
                      : 'text-sc-muted hover:text-sc-text after:bg-transparent',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5 border-r border-sc-border pr-3">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-xs font-medium text-sc-text">{user.name}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-sc-amber mt-0.5">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
            <button
              id="logout-btn"
              onClick={logoutUser}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:border-sc-border2 hover:text-sc-text active:scale-[0.98]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── Ticker Strip ────────────────────────────────────────────────── */}
      <div
        className="w-full overflow-hidden border-b border-sc-border bg-sc-panel py-1.5 select-none"
        aria-hidden="true"
      >
        <div className="animate-ticker flex gap-16 font-mono text-[9px] uppercase tracking-[0.18em] text-sc-amber/70">
          <span>{TICKER_TEXT}</span>
          <span>{TICKER_TEXT}</span>
          <span>{TICKER_TEXT}</span>
        </div>
      </div>

      {/* ── Mobile Nav ──────────────────────────────────────────────────── */}
      <div className="flex md:hidden overflow-x-auto border-b border-sc-border bg-sc-panel px-4 py-2 gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-sc-amber/10 text-sc-amber'
                  : 'text-sc-muted hover:text-sc-text',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  );
}
