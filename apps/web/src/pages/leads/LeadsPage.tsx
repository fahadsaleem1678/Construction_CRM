import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CreateLeadRequest, Lead, LeadActivity, LeadSource, LeadStatus } from '@construction-crm/shared-types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ActivityStrip } from '../../components/ActivityStrip';
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  startLeadQuotation,
  updateLead
} from '../../lib/api';

const statuses: LeadStatus[] = ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'];
const sources: LeadSource[] = ['walk_in', 'referral', 'website', 'phone', 'social', 'other'];

const statusLabels: Record<LeadStatus, string> = {
  new: 'New', contacted: 'Contacted', site_visit: 'Site Visit',
  quoted: 'Quoted', won: 'Won', lost: 'Lost'
};
const sourceLabels: Record<LeadSource, string> = {
  walk_in: 'Walk-in', referral: 'Referral', website: 'Website',
  phone: 'Phone', social: 'Social', other: 'Other'
};

const statusBadge: Record<LeadStatus, string> = {
  new: 'badge-blue', contacted: 'badge-yellow', site_visit: 'badge-amber',
  quoted: 'badge-amber', won: 'badge-green', lost: 'badge-red'
};

const emptyLead: CreateLeadRequest = {
  clientName: '', contactPhone: '', contactEmail: '',
  source: 'phone', status: 'new', estimatedValue: 0, notes: ''
};

function currency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

/** Shared select style - dark themed */
const SC_SELECT = [
  'w-full rounded-lg border border-sc-border bg-sc-surface px-3 py-2 text-xs text-sc-text',
  'focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30',
  'transition-colors appearance-none',
].join(' ');

const SC_TEXTAREA = [
  'min-h-[80px] w-full rounded-lg border border-sc-border bg-sc-surface px-3 py-2 text-xs text-sc-text placeholder:text-sc-muted',
  'focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30',
  'resize-none transition-colors',
].join(' ');

export function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [form, setForm] = useState<CreateLeadRequest>(emptyLead);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;

  async function loadLeads(nextPage = page) {
    setLoading(true); setError(null);
    try {
      const res = await listLeads({ page: nextPage, pageSize, status: status || undefined, source: source || undefined });
      setLeads(res.leads); setTotal(res.total); setPage(res.page);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load leads'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadLeads(1); }, [status, source]);

  async function openLead(lead: Lead) {
    setSelected(lead);
    try {
      const detail = await getLead(lead.id);
      setSelected(detail.lead); setActivities(detail.activities);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load lead detail'); }
  }

  async function submitLead(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    try {
      await createLead({ ...form, contactEmail: form.contactEmail || null, estimatedValue: Number(form.estimatedValue ?? 0), notes: form.notes || null });
      setForm(emptyLead); setMessage('Lead created successfully'); await loadLeads(1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create lead'); }
  }

  async function changeStatus(lead: Lead, nextStatus: LeadStatus) {
    setError(null);
    const res = await updateLead(lead.id, { status: nextStatus }).catch((e) => { setError(e instanceof Error ? e.message : 'Unable to update lead'); return null; });
    if (!res) return;
    setLeads((cur) => cur.map((l) => (l.id === lead.id ? res.lead : l)));
    if (selected?.id === lead.id) await openLead(res.lead);
  }

  async function removeLead(lead: Lead) {
    setError(null); await deleteLead(lead.id);
    setSelected(null); setActivities([]); await loadLeads(page);
  }

  async function startQuotation(lead: Lead) {
    setError(null);
    const res = await startLeadQuotation(lead.id).catch((e) => { setError(e instanceof Error ? e.message : 'Unable to start quotation'); return null; });
    if (!res) return;
    setSelected(null);
    navigate(`/quotations?leadId=${encodeURIComponent(res.quotationDraft.leadId)}`);
  }

  const pipeline = useMemo(() =>
    statuses.map((s) => ({ status: s, leads: leads.filter((l) => l.status === s) })),
    [leads]
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-sc-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-sc-bright">Leads</h1>
          <p className="mt-0.5 text-xs text-sc-muted">Capture and track client opportunities through to conversion.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="refresh-leads-btn"
            onClick={() => void loadLeads(page)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:text-sc-text active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Refresh
          </button>
          <button
            type="button"
            id="toggle-view-btn"
            onClick={() => setView(view === 'table' ? 'kanban' : 'table')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sc-raised border border-sc-border2 px-3 text-xs font-medium text-sc-text transition hover:bg-sc-border active:scale-[0.98]"
          >
            {view === 'table' ? 'Kanban' : 'Table'}
          </button>
        </div>
      </div>

      {/* ── Two-column: form sidebar + content ─────────────────────────── */}
      <ActivityStrip items={['New lead intake is available', 'Track qualification across the pipeline', 'Start a quotation from any qualified lead']} />

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">

        {/* Sidebar */}
        <aside className="space-y-8 lg:border-r lg:border-sc-border lg:pr-8">

          {/* Create lead form */}
          <section>
            <h2 className="mb-4 font-medium text-[10px]  tracking-[0.15em] text-sc-muted">New Lead</h2>
            <form onSubmit={submitLead} id="create-lead-form" className="space-y-3">
              <TextField label="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
              <TextField label="Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} required />
              <TextField label="Email" type="email" value={form.contactEmail ?? ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <TextField label="Estimated value" type="number" min="0" value={form.estimatedValue ?? 0} onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })} />
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[10px] font-medium  tracking-[0.12em] text-sc-sub">Source</label>
                <select className={SC_SELECT} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}>
                  {sources.map((s) => <option key={s} value={s}>{sourceLabels[s]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[10px] font-medium  tracking-[0.12em] text-sc-sub">Notes</label>
                <textarea className={SC_TEXTAREA} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full h-9 text-xs">Create lead</Button>
            </form>
          </section>

          {/* Filters */}
          <section className="border-t border-sc-border pt-6 space-y-3">
            <h2 className="font-medium text-[10px]  tracking-[0.15em] text-sc-muted">Filter</h2>
            <select className={SC_SELECT} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus | '')}>
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
            <select className={SC_SELECT} value={source} onChange={(e) => setSource(e.target.value as LeadSource | '')}>
              <option value="">All sources</option>
              {sources.map((s) => <option key={s} value={s}>{sourceLabels[s]}</option>)}
            </select>
          </section>
        </aside>

        {/* Content */}
        <section className="space-y-4 min-w-0">
          {message && (
            <div className="rounded-lg border border-green-900/50 bg-sc-green-m/30 px-3 py-2.5 text-xs text-green-400 animate-slide-in" role="status">{message}</div>
          )}
          {error && (
            <div className="rounded-lg border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">{error}</div>
          )}

          <div className="flex items-center justify-between border-b border-sc-border pb-3">
            <span className="font-medium text-[10px]  tracking-widest text-sc-muted">
              {leads.length} of {total} leads
            </span>
            {total > pageSize && (
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => void loadLeads(page - 1)} className="h-7 rounded-lg border border-sc-border bg-sc-surface px-2.5 text-[11px] text-sc-sub disabled:opacity-40 hover:bg-sc-raised">Prev</button>
                <span className="font-medium text-[10px] text-sc-muted">Page {page}</span>
                <button disabled={page * pageSize >= total} onClick={() => void loadLeads(page + 1)} className="h-7 rounded-lg border border-sc-border bg-sc-surface px-2.5 text-[11px] text-sc-sub disabled:opacity-40 hover:bg-sc-raised">Next</button>
              </div>
            )}
          </div>

          {loading && (
            <div className="py-16 text-center font-medium text-[10px]  tracking-widest text-sc-muted">
              Loading leads...
            </div>
          )}

          {/* Table view */}
          {!loading && view === 'table' && (
            <div className="overflow-x-auto rounded-lg border border-sc-border">
              <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sc-border bg-sc-panel">
                    {['Client', 'Contact', 'Source', 'Value', 'Status', ''].map((h) => (
                      <th key={h} className={`px-4 py-3 font-medium text-[9px] font-medium  tracking-[0.15em] text-sc-muted ${h === '' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sc-border bg-sc-surface">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center font-medium text-[10px]  tracking-widest text-sc-muted">
                        No leads found. Add one using the form.
                      </td>
                    </tr>
                  ) : leads.map((lead) => (
                    <tr key={lead.id} className="sc-table-row transition-colors duration-100">
                      <td className="px-4 py-3 font-medium text-sc-bright">{lead.clientName}</td>
                      <td className="px-4 py-3 text-sc-muted">
                        <div>{lead.contactPhone}</div>
                        {lead.contactEmail && <div className="text-[10px] mt-0.5 text-sc-muted/70">{lead.contactEmail}</div>}
                      </td>
                      <td className="px-4 py-3 text-sc-sub">{sourceLabels[lead.source]}</td>
                      <td className="px-4 py-3 font-medium font-medium text-sc-text">{currency(lead.estimatedValue)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => void changeStatus(lead, e.target.value as LeadStatus)}
                          className="rounded-lg border border-sc-border bg-sc-raised px-2 py-1 text-[11px] text-sc-text focus:outline-none focus:border-sc-amber appearance-none"
                        >
                          {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void openLead(lead)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-sc-border bg-sc-panel px-2.5 text-[10px] font-medium text-sc-sub hover:text-sc-text hover:bg-sc-raised transition active:scale-[0.98]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kanban view */}
          {!loading && view === 'kanban' && (
            <div className="overflow-x-auto pb-4">
              <div className="grid min-w-[900px] grid-cols-6 gap-3 items-start">
                {pipeline.map((column) => (
                  <div key={column.status} className="rounded-lg border border-sc-border bg-sc-surface p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-sc-border pb-2">
                      <span className="font-medium text-[9px]  tracking-widest text-sc-muted font-medium">
                        {statusLabels[column.status]}
                      </span>
                      <span className="rounded bg-sc-raised border border-sc-border2 px-1.5 py-0.5 font-medium text-[9px] text-sc-muted">
                        {column.leads.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {column.leads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => void openLead(lead)}
                          className="rounded-lg border border-sc-border bg-sc-panel p-2.5 cursor-pointer transition hover:border-sc-amber/40 hover:bg-sc-raised active:scale-[0.99] space-y-1.5"
                        >
                          <div className="text-xs font-medium text-sc-bright leading-tight">{lead.clientName}</div>
                          <div className="flex items-center justify-between font-medium text-[9px] text-sc-muted">
                            <span>{sourceLabels[lead.source]}</span>
                            <span className="text-sc-sub">{currency(lead.estimatedValue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={() => setSelected(null)}>
          <aside
            className="ml-auto h-full w-full max-w-md overflow-y-auto bg-sc-panel border-l border-sc-border p-6 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between border-b border-sc-border pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-sc-bright leading-tight">{selected.clientName}</h2>
                <p className="font-medium text-[10px] text-sc-muted">
                  {selected.contactPhone}{selected.contactEmail ? ` · ${selected.contactEmail}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-sc-border bg-sc-surface px-2.5 py-1.5 text-xs font-medium text-sc-sub hover:text-sc-text transition"
              >
                Close
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-sc-border rounded-lg border border-sc-border overflow-hidden">
              <div className="p-3">
                <span className="font-medium text-[9px]  tracking-widest text-sc-muted">Status</span>
                <span className={`mt-1.5 block text-xs font-semibold px-2 py-0.5 rounded-lg w-fit ${statusBadge[selected.status]}`}>
                  {statusLabels[selected.status]}
                </span>
              </div>
              <div className="p-3">
                <span className="font-medium text-[9px]  tracking-widest text-sc-muted">Budget est.</span>
                <span className="mt-1.5 block font-medium text-sm font-semibold text-sc-amber">{currency(selected.estimatedValue)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void startQuotation(selected)} className="h-8 px-3 text-xs">
                Start quotation
              </Button>
              <Button variant="danger" onClick={() => void removeLead(selected)} className="h-8 px-3 text-xs">
                Delete lead
              </Button>
            </div>

            {/* Notes */}
            <section className="space-y-2">
              <h3 className="font-medium text-[10px]  tracking-widest text-sc-muted">Notes</h3>
              <p className="rounded-lg border border-sc-border bg-sc-surface p-3 text-xs leading-relaxed text-sc-sub whitespace-pre-wrap">
                {selected.notes || 'No notes recorded.'}
              </p>
            </section>

            {/* Activity log */}
            <section className="space-y-3">
              <h3 className="font-medium text-[10px]  tracking-widest text-sc-muted">Activity</h3>
              {activities.length ? (
                <div className="divide-y divide-sc-border border-y border-sc-border">
                  {activities.map((a) => (
                    <div key={a.id} className="py-3 space-y-0.5">
                      <div className="text-xs font-medium text-sc-text capitalize">
                        {a.action.replaceAll('_', ' ')}
                      </div>
                      <div className="font-medium text-[10px] text-sc-muted">
                        {a.userName ?? 'System'} · {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-medium text-[10px] text-sc-muted">No activity recorded yet.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
