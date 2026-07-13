import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useSessionStore } from '../lib/sessionStore';

export function LoginPage() {
  const { user, loginUser, registerFirstOwner, error } = useSessionStore();
  const [mode, setMode] = useState<'login' | 'owner'>('login');
  const [email, setEmail] = useState('owner@construction.local');
  const [name, setName] = useState('Company Owner');
  const [password, setPassword] = useState('ChangeMe123!');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'owner') {
        await registerFirstOwner(email, name, password);
      } else {
        await loginUser(email, password);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-sc-base text-sc-text flex flex-col lg:flex-row">

      {/* ── Left: Editorial Panel ──────────────────────────────────────── */}
      <div className="relative flex flex-col justify-between p-10 lg:w-[55%] border-b lg:border-b-0 lg:border-r border-sc-border overflow-hidden">

        {/* Blueprint grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#d97706 1px, transparent 1px), linear-gradient(90deg, #d97706 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Radial amber glow top-left */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #d97706, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* Brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <polygon points="13,1 24,7 24,19 13,25 2,19 2,7" fill="#d97706" stroke="#f59e0b" strokeWidth="0.5" />
            <polygon points="13,6 20,10 20,16 13,20 6,16 6,10" fill="#0f0f0f" stroke="#d97706" strokeWidth="0.75" />
            <line x1="13" y1="10" x2="13" y2="16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="12" x2="16" y2="12" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <span className="block text-base font-semibold tracking-tight text-sc-bright">SiteCore</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-sc-amber">Construction CRM</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-lg space-y-6 py-12 lg:py-0">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-sc-bright leading-tight sm:text-5xl">
              Build projects.<br />
              <span className="text-sc-amber">Not spreadsheets.</span>
            </h1>
            <p className="text-sm leading-relaxed text-sc-sub max-w-sm">
              A unified operations platform for construction companies. Manage leads, quotations, and active projects from a single secure workspace.
            </p>
          </div>

          {/* Feature list — divider pattern, not cards */}
          <div className="divide-y divide-sc-border border-y border-sc-border">
            {[
              { label: 'Lead pipeline', desc: 'Track prospects from first contact to signed contract' },
              { label: 'Quotations', desc: 'Build itemised proposals with markup and tax' },
              { label: 'Project tracking', desc: 'Milestones, budgets, and crew assignments' },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sc-amber" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-sc-text">{f.label}</span>
                  <span className="mx-1.5 text-sc-border2" aria-hidden="true">—</span>
                  <span className="text-xs text-sc-muted">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom meta */}
        <div className="relative z-10 flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">
            Phase 4 Live
          </span>
          <span className="h-px flex-1 bg-sc-border" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">
            Role-based access
          </span>
        </div>
      </div>

      {/* ── Right: Auth Form Panel ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mode toggle */}
          <div className="mb-8 grid grid-cols-2 rounded-md bg-sc-surface p-1 text-xs font-medium border border-sc-border">
            {(['login', 'owner'] as const).map((m) => (
              <button
                key={m}
                type="button"
                id={`mode-${m}`}
                onClick={() => setMode(m)}
                className={[
                  'rounded py-2 px-3 transition-all duration-150',
                  mode === m
                    ? 'bg-sc-raised text-sc-bright shadow-sm'
                    : 'text-sc-muted hover:text-sc-text',
                ].join(' ')}
              >
                {m === 'login' ? 'Sign in' : 'First owner'}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-sc-bright tracking-tight">
              {mode === 'owner' ? 'Create owner account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-xs text-sc-muted">
              {mode === 'owner'
                ? 'Register the primary administrator for your organisation.'
                : 'Sign in to access your SiteCore workspace.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} id="auth-form" className="space-y-4">
            {mode === 'owner' && (
              <TextField
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            )}
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'owner' ? 'new-password' : 'current-password'}
              required
            />

            {error && (
              <div className="rounded-md border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full mt-2 h-10 text-sm font-semibold"
            >
              {busy ? 'Verifying...' : mode === 'owner' ? 'Create account' : 'Sign in'}
              {!busy && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wider text-sc-muted">
            Secure access · Role-based permissions
          </p>
        </div>
      </div>
    </main>
  );
}
