import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BriefcaseBusiness,
  FolderOpen,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  UsersRound,
  X,
} from 'lucide-react';
import { useSessionStore } from '../lib/sessionStore';

type LayoutProps = { children: React.ReactNode };

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: UsersRound },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/projects', label: 'Projects', icon: BriefcaseBusiness },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/employees', label: 'Employees', icon: HardHat },
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
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
            <label className="hidden h-9 items-center gap-2 rounded-lg border border-sc-border-subtle bg-sc-surface px-3 text-xs text-sc-muted lg:flex">
              <span className="text-sm">⌕</span>
              <input aria-label="Search workspace" className="w-32 bg-transparent text-xs text-sc-text outline-none placeholder:text-sc-muted" placeholder="Search" />
            </label>
            <button className="rounded-lg p-2.5 text-sc-muted transition-colors hover:bg-sc-surface hover:text-sc-text" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.7} aria-hidden="true" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-sc-surface-strong text-xs font-semibold text-sc-amber">{initials}</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
