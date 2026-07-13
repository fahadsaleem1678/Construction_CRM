import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { inviteUser } from '../lib/api';
import { useSessionStore } from '../lib/sessionStore';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useSessionStore();
  const [email, setEmail] = useState('manager@construction.local');
  const [name, setName] = useState('Site Manager');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInviteToken(null);
    setInviteSent(false);
    try {
      const response = await inviteUser({ email, name, role: 'manager' });
      setInviteToken(response.inviteToken);
      setInviteSent(Boolean(response.providerInviteSent));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to invite manager');
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Welcome Header ────────────────────────────────────────────── */}
      <section className="border-b border-sc-border pb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-sc-amber">
              Operations Center
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-sc-bright">
              Welcome back, {user?.name}
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-sc-muted">
              Your construction operations hub. Manage leads, quotations, and live projects from one workspace.
            </p>
          </div>

          {/* Quick-access links */}
          <div className="flex flex-wrap gap-2">
            <Link
              to="/leads"
              id="nav-leads-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:border-sc-border2 hover:text-sc-text"
            >
              Leads
            </Link>
            <Link
              to="/quotations"
              id="nav-quotations-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:border-sc-border2 hover:text-sc-text"
            >
              Quotations
            </Link>
            <Link
              to="/projects"
              id="nav-projects-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sc-amber px-3 text-xs font-semibold text-sc-base transition hover:bg-sc-amber-h"
            >
              Projects
            </Link>
          </div>
        </div>
      </section>

      {/* ── Status Strip ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 divide-x divide-sc-border rounded-md border border-sc-border bg-sc-surface sm:grid-cols-4">
        {[
          { label: 'Module', value: 'Leads',        sub: 'Ready for intake'    },
          { label: 'Module', value: 'Quotations',   sub: 'Proposal engine live'},
          { label: 'Module', value: 'Projects',     sub: 'Phase 4 active'      },
          { label: 'Access', value: user?.role ?? 'Owner', sub: 'Credentials verified' },
        ].map((item) => (
          <div key={item.value} className="flex flex-col gap-0.5 px-5 py-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-sc-muted">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-sc-bright capitalize">{item.value}</span>
            <span className="text-[11px] text-sc-muted">{item.sub}</span>
          </div>
        ))}
      </section>

      {/* ── Content Grid ──────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

        {/* Invite Form */}
        <section>
          <div className="mb-5 border-b border-sc-border pb-4">
            <h3 className="text-sm font-semibold text-sc-bright">Invite staff account</h3>
            <p className="mt-0.5 text-xs text-sc-muted">
              Add project managers or site supervisors to your team.
            </p>
          </div>

          <form
            onSubmit={submitInvite}
            id="invite-form"
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <TextField
              label="Staff name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Staff email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="h-9 px-5 text-xs font-semibold whitespace-nowrap">
              Send invite
            </Button>
          </form>

          {/* Feedback states */}
          {error && (
            <div className="mt-4 rounded-md border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">
              {error}
            </div>
          )}
          {inviteSent && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md border border-green-900/50 bg-sc-green-m/30 px-3 py-2.5 animate-slide-in">
              <CheckIcon />
              <p className="text-xs text-green-400">Invite email sent to <strong className="font-semibold">{email}</strong>.</p>
            </div>
          )}
          {inviteToken && (
            <div className="mt-4 space-y-2.5 rounded-md border border-green-900/50 bg-sc-green-m/30 p-4 animate-slide-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
                <CheckIcon />
                Invite token generated
              </div>
              <code className="block w-full break-all rounded-md border border-sc-border bg-sc-base px-3 py-2.5 font-mono text-[11px] text-sc-sub">
                {inviteToken}
              </code>
              <p className="text-[11px] text-sc-muted">
                Share via <span className="font-mono text-sc-sub">/accept-invite?token=...</span>
              </p>
            </div>
          )}
        </section>

        {/* Sidebar status */}
        <aside className="border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 border-sc-border">
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-sc-muted">
            System status
          </h3>
          <div className="divide-y divide-sc-border">
            {[
              { label: 'Leads module',    status: 'Operational' },
              { label: 'Quotation engine', status: 'Operational' },
              { label: 'Projects module', status: 'Active — Phase 4' },
              { label: 'Role access',     status: user?.role === 'owner' ? 'Owner · Full access' : 'Restricted' },
              { label: 'Finance access',  status: 'Authorised' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-xs text-sc-muted">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-sc-green" aria-hidden="true" />
                  <span className="font-mono text-[10px] text-sc-sub">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
