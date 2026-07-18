import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BriefcaseBusiness,
  FolderOpen,
  FileText,
  HardHat,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import type { GlobalSearchResult, UserRole } from '@construction-crm/shared-types';
import { globalSearch } from '../lib/api';
import { getDashboardAnalytics } from '../lib/api';
import { LoadingPanel } from './AsyncState';
import { useSessionStore } from '../lib/sessionStore';

type LayoutProps = { children: React.ReactNode };

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }> = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin', 'manager', 'accountant', 'employee'] },
  { to: '/leads', label: 'Leads', icon: UsersRound, roles: ['owner', 'admin', 'manager'] },
  { to: '/quotations', label: 'Quotations', icon: FileText, roles: ['owner', 'admin', 'manager'] },
  { to: '/projects', label: 'Projects', icon: BriefcaseBusiness, roles: ['owner', 'admin', 'manager', 'employee'] },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText, roles: ['owner', 'admin', 'accountant', 'employee'] },
  { to: '/invoices', label: 'Invoices', icon: FileText, roles: ['owner', 'admin', 'manager', 'accountant'] },
  { to: '/documents', label: 'Documents', icon: FolderOpen, roles: ['owner', 'admin', 'manager', 'accountant'] },
  { to: '/employees', label: 'Employees', icon: HardHat, roles: ['owner', 'admin', 'manager'] },
  { to: '/audit-log', label: 'Audit log', icon: FileText, roles: ['owner', 'admin'] },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/leads': 'Leads',
  '/quotations': 'Quotations',
  '/projects': 'Projects',
  '/expenses': 'Expenses',
  '/invoices': 'Invoices',
  '/documents': 'Documents',
  '/employees': 'Employees',
  '/audit-log': 'Audit log',
};

function SiteCoreMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-sc-amber/30 bg-sc-amber/10 text-sc-amber">
        <HardHat size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div>
        <span className="block text-[15px] font-semibold tracking-tight text-sc-bright">SiteCore</span>
        <span className="block text-[11px] text-sc-muted">Construction CRM</span>
      </div>
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSessionStore((state) => state.user);
  const visibleItems = NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role));

  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {visibleItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => [
            'group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            isActive
              ? 'bg-sc-amber/10 text-sc-bright before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-sc-amber'
              : 'text-sc-sub hover:bg-sc-surface hover:text-sc-text',
          ].join(' ')}
        >
          <Icon size={18} strokeWidth={1.7} className="text-sc-muted transition-colors group-hover:text-sc-amber" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserPanel() {
  const { user, logoutUser } = useSessionStore();
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? 'SC';

  return (
    <div className="border-t border-sc-border-subtle pt-4">
      <div className="flex items-center gap-3 px-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sc-surface-strong text-xs font-semibold text-sc-amber">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sc-text">{user?.name}</p>
          <p className="truncate text-xs capitalize text-sc-muted">{user?.role}</p>
        </div>
        <button onClick={logoutUser} className="rounded-lg p-2 text-sc-muted transition-colors hover:bg-sc-surface hover:text-sc-text" aria-label="Log out" title="Log out">
          <LogOut size={17} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const SEARCH_TYPE_LABELS: Record<GlobalSearchResult['type'], string> = {
  lead: 'Lead',
  project: 'Project',
  invoice: 'Invoice',
};

function GlobalSearchBox() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await globalSearch(query, 8);
        if (!cancelled) {
          setResults(response.results);
          setError(null);
          setIsOpen(true);
        }
      } catch (searchError) {
        if (!cancelled) {
          setResults([]);
          setError(searchError instanceof Error ? searchError.message : 'Search failed');
          setIsOpen(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);

  function chooseResult(result: GlobalSearchResult) {
    navigate(result.href);
    setTerm('');
    setResults([]);
    setIsOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) chooseResult(results[0]);
  }

  const showPanel = isOpen && term.trim().length >= 2;

  return (
    <div className="relative hidden lg:block">
      <form
        onSubmit={handleSubmit}
        className="flex h-9 items-center gap-2 rounded-lg border border-sc-border-subtle bg-sc-surface px-3 text-xs text-sc-muted transition-colors focus-within:border-sc-amber/50"
      >
        <Search size={14} strokeWidth={1.8} aria-hidden="true" />
        <input
          aria-label="Search workspace"
          className="w-44 bg-transparent text-xs text-sc-text outline-none placeholder:text-sc-muted"
          placeholder="Search leads, projects, invoices"
          value={term}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => {
            if (term.trim().length >= 2) setIsOpen(true);
          }}
        />
        {isLoading && <LoaderCircle size={14} className="animate-spin text-sc-amber" aria-hidden="true" />}
      </form>

      {showPanel && (
        <div className="absolute right-0 top-11 z-40 w-[360px] overflow-hidden rounded-2xl border border-sc-border bg-sc-panel shadow-sc-panel">
          <div className="border-b border-sc-border-subtle px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sc-muted">Workspace search</p>
          </div>

          {error && <p className="px-4 py-4 text-sm text-red-300">{error}</p>}

          {!error && !isLoading && results.length === 0 && (
            <p className="px-4 py-4 text-sm text-sc-muted">No matching records found.</p>
          )}

          {!error && results.length > 0 && (
            <div className="max-h-[360px] overflow-y-auto py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseResult(result)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sc-surface"
                >
                  <span className="mt-0.5 rounded-full border border-sc-amber/25 bg-sc-amber/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sc-amber">
                    {SEARCH_TYPE_LABELS[result.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-sc-bright">{result.title}</span>
                    <span className="block truncate text-xs text-sc-muted">{result.subtitle}</span>
                    <span className="mt-1 block text-[11px] capitalize text-sc-sub">
                      Matched {result.matchedField} · {result.status.replace('_', ' ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof getDashboardAnalytics>>['alerts']>([]); const navigate = useNavigate();
  async function toggle() { const next = !open; setOpen(next); if (next && alerts.length === 0) { setLoading(true); try { setAlerts((await getDashboardAnalytics()).alerts); } finally { setLoading(false); } } }
  return <div className="relative"><button type="button" onClick={() => void toggle()} className="rounded-lg p-2.5 text-sc-muted transition-colors hover:bg-sc-surface hover:text-sc-text" aria-label="Notifications" aria-expanded={open}><Bell size={18} strokeWidth={1.7} aria-hidden="true" /></button>{open && <div className="absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sc-border bg-sc-panel shadow-sc-panel"><div className="border-b border-sc-border-subtle px-4 py-3"><p className="text-sm font-semibold text-sc-bright">Notifications</p><p className="mt-0.5 text-xs text-sc-muted">Live signals from your workspace</p></div>{loading ? <div className="p-4"><LoadingPanel label="Loading notifications" /></div> : alerts.length === 0 ? <p className="px-4 py-8 text-center text-sm text-sc-muted">No actions need attention right now.</p> : <div className="max-h-[360px] overflow-y-auto py-2">{alerts.map((alert) => <button key={alert.id} type="button" onClick={() => { if (alert.href) navigate(alert.href); setOpen(false); }} className="w-full px-4 py-3 text-left transition-colors hover:bg-sc-surface"><p className="text-sm font-medium text-sc-bright">{alert.title}</p><p className="mt-1 text-xs leading-5 text-sc-muted">{alert.detail}</p></button>)}</div>}</div>}</div>;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const { user } = useSessionStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? 'SC';
  const date = new Intl.DateTimeFormat('en-PK', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());

  return (
    <div className="min-h-[100dvh] bg-sc-base text-sc-text">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-sc-border-subtle bg-sc-panel px-4 py-5 md:flex">
        <SiteCoreMark />
        <div className="mt-9 flex-1">
          <Navigation />
        </div>
        <UserPanel />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 flex h-full w-[276px] flex-col border-r border-sc-border bg-sc-panel p-5 shadow-sc-panel">
            <div className="flex items-center justify-between">
              <SiteCoreMark />
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-sc-muted hover:bg-sc-surface hover:text-sc-text" aria-label="Close navigation">
                <X size={19} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-9 flex-1"><Navigation onNavigate={() => setMobileMenuOpen(false)} /></div>
            <UserPanel />
          </aside>
        </div>
      )}

      <div className="min-h-[100dvh] md:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sc-border-subtle bg-sc-base/95 px-4 backdrop-blur md:h-[72px] md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-sc-sub hover:bg-sc-surface md:hidden" aria-label="Open navigation">
              <Menu size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-sc-bright md:text-lg">{PAGE_TITLES[pathname] ?? 'SiteCore'}</h1>
              <p className="hidden text-xs text-sc-muted sm:block">{date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <GlobalSearchBox />
            <Notifications />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-sc-surface-strong text-xs font-semibold text-sc-amber">{initials}</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
