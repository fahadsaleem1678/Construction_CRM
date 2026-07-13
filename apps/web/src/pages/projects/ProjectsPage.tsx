import { FormEvent, useEffect, useState } from 'react';
import type {
  Project,
  ProjectActivity,
  ProjectStatus,
  MilestoneStatus,
  AuthUser,
  Quotation
} from '@construction-crm/shared-types';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import {
  listProjects,
  getProject,
  createProject,
  createProjectFromQuotation,
  updateProject,
  deleteProject,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addAssignment,
  removeAssignment,
  listUsers,
  listQuotations
} from '../../lib/api';
import { useSessionStore } from '../../lib/sessionStore';

const statuses: ProjectStatus[] = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];
const statusLabels: Record<ProjectStatus, string> = {
  planning: 'Planning', in_progress: 'In Progress', on_hold: 'On Hold',
  completed: 'Completed', cancelled: 'Cancelled'
};
const statusBadge: Record<ProjectStatus, string> = {
  planning:    'badge-yellow',
  in_progress: 'badge-blue',
  on_hold:     'badge-amber',
  completed:   'badge-green',
  cancelled:   'badge-red',
};

function currency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const SC_SELECT = [
  'w-full rounded-md border border-sc-border bg-sc-surface px-3 py-2 text-xs text-sc-text',
  'focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30',
  'transition-colors appearance-none',
].join(' ');

/** Inline SVG Refresh icon */
function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  );
}

/** Modal wrapper */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-md rounded-md border border-sc-border bg-sc-panel shadow-sc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-sc-border px-5 py-4">
          <h2 className="text-sm font-semibold text-sc-bright">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-sc-border bg-sc-surface px-2.5 py-1 text-xs text-sc-muted hover:text-sc-text transition">Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { user } = useSessionStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFromQuoteModal, setShowFromQuoteModal] = useState(false);

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [budget, setBudget] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');

  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [acceptedQuotations, setAcceptedQuotations] = useState<Quotation[]>([]);
  const [activeUsers, setActiveUsers] = useState<AuthUser[]>([]);

  const [selected, setSelected] = useState<Project | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);

  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeRole, setAssigneeRole] = useState('');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.role && ['owner', 'admin', 'manager'].includes(user.role);
  const isOwnerOrAdmin = user?.role && ['owner', 'admin'].includes(user.role);

  const pageSize = 20;

  async function loadProjects(nextPage = page) {
    setLoading(true); setError(null);
    try {
      const res = await listProjects({ page: nextPage, pageSize, status: statusFilter || undefined });
      setProjects(res.projects); setPage(res.page); setTotalProjects(res.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load projects'); }
    finally { setLoading(false); }
  }

  async function loadUsersAndQuotes() {
    try {
      const [usersList, quotesList] = await Promise.all([listUsers(), listQuotations()]);
      setActiveUsers(usersList);
      setAcceptedQuotations(quotesList.quotations.filter((q) => q.status === 'accepted'));
    } catch (e) { console.error('Failed to load users or quotes', e); }
  }

  useEffect(() => { void loadProjects(1); void loadUsersAndQuotes(); }, [statusFilter]);

  async function openProject(project: Project) {
    setError(null);
    try {
      const detail = await getProject(project.id);
      setSelected(detail.project); setActivities(detail.activities);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load project'); }
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault(); setError(null); setMessage(null);
    try {
      const res = await createProject({ name, clientName, budget: Number(budget), startDate: startDate ? new Date(startDate).toISOString() : null, endDate: endDate ? new Date(endDate).toISOString() : null, address: address || null });
      setMessage(`Project "${res.project.name}" created`);
      setShowCreateModal(false); setName(''); setClientName(''); setBudget(0); setStartDate(''); setEndDate(''); setAddress('');
      await loadProjects(1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create project'); }
  }

  async function handleCreateFromQuote(e: FormEvent) {
    e.preventDefault(); setError(null); setMessage(null);
    if (!selectedQuotationId) return;
    try {
      const res = await createProjectFromQuotation(selectedQuotationId);
      setMessage(`Project "${res.project.name}" created from quotation`);
      setShowFromQuoteModal(false); setSelectedQuotationId('');
      await loadProjects(1); await openProject(res.project);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create from quotation'); }
  }

  async function handleUpdateStatus(project: Project, nextStatus: ProjectStatus) {
    setError(null);
    try {
      const res = await updateProject(project.id, { status: nextStatus });
      setProjects((cur) => cur.map((p) => (p.id === project.id ? res.project : p)));
      if (selected?.id === project.id) await openProject(res.project);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update status'); }
  }

  async function handleUpdateProgress(project: Project, progress: number) {
    setError(null);
    try {
      const res = await updateProject(project.id, { progress });
      setProjects((cur) => cur.map((p) => (p.id === project.id ? res.project : p)));
      if (selected?.id === project.id) await openProject(res.project);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update progress'); }
  }

  async function handleAddMilestone(e: FormEvent) {
    e.preventDefault(); if (!selected) return; setError(null);
    try {
      await addMilestone(selected.id, { title: milestoneTitle, dueDate: milestoneDueDate ? new Date(milestoneDueDate).toISOString() : null });
      setMilestoneTitle(''); setMilestoneDueDate(''); await openProject(selected);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add milestone'); }
  }

  async function handleToggleMilestone(milestoneId: string, currentStatus: MilestoneStatus) {
    if (!selected) return; setError(null);
    const nextStatus: MilestoneStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try { await updateMilestone(selected.id, milestoneId, { status: nextStatus }); await openProject(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update milestone'); }
  }

  async function handleDeleteMilestone(milestoneId: string) {
    if (!selected) return; setError(null);
    try { await deleteMilestone(selected.id, milestoneId); await openProject(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete milestone'); }
  }

  async function handleAddAssignment(e: FormEvent) {
    e.preventDefault(); if (!selected || !assigneeUserId || !assigneeRole) return; setError(null);
    try {
      await addAssignment(selected.id, { userId: assigneeUserId, roleOnProject: assigneeRole });
      setAssigneeUserId(''); setAssigneeRole(''); await openProject(selected);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to assign member'); }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!selected) return; setError(null);
    try { await removeAssignment(selected.id, assignmentId); await openProject(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to remove assignment'); }
  }

  async function handleRemoveProject(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    setError(null);
    try { await deleteProject(project.id); setSelected(null); await loadProjects(page); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete project'); }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-sc-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-sc-bright">Projects</h1>
          <p className="mt-0.5 text-xs text-sc-muted">Track builds, milestones, crew assignments, and budget progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" id="refresh-projects-btn" onClick={() => void loadProjects(page)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:text-sc-text active:scale-[0.98]">
            <RefreshIcon /> Refresh
          </button>
          {isManager && (
            <>
              <button type="button" id="from-quote-btn" onClick={() => setShowFromQuoteModal(true)}
                className="inline-flex h-8 items-center rounded-md border border-sc-border bg-sc-surface px-3 text-xs font-medium text-sc-sub transition hover:text-sc-text active:scale-[0.98]">
                From quote
              </button>
              <button type="button" id="new-project-btn" onClick={() => setShowCreateModal(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sc-amber px-3 text-xs font-semibold text-sc-base transition hover:bg-sc-amber-h active:scale-[0.98]">
                + New project
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Status Filter Pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {(['', ...statuses] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s as ProjectStatus | '')}
            className={[
              'rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition',
              statusFilter === s
                ? 'bg-sc-amber text-sc-base font-semibold'
                : 'border border-sc-border bg-sc-surface text-sc-muted hover:text-sc-text',
            ].join(' ')}>
            {s === '' ? 'All' : statusLabels[s as ProjectStatus]}
          </button>
        ))}
      </div>

      {/* ── Notifications ───────────────────────────────────────────────── */}
      {message && <div className="rounded-md border border-green-900/50 bg-sc-green-m/30 px-3 py-2.5 text-xs text-green-400 animate-slide-in" role="status">{message}</div>}
      {error   && <div className="rounded-md border border-sc-red/40 bg-sc-red-m/30 px-3 py-2.5 text-xs text-red-400 animate-slide-in" role="alert">{error}</div>}

      {/* ── Projects Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center font-mono text-[10px] uppercase tracking-widest text-sc-muted">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-sc-border bg-sc-surface py-20 text-center max-w-lg mx-auto">
          <p className="text-sm font-medium text-sc-text">No projects found</p>
          <p className="mt-1 text-xs text-sc-muted">Create a new project or convert an accepted quotation.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => void openProject(project)}
                className="cursor-pointer rounded-md border border-sc-border bg-sc-surface p-4 hover:border-sc-amber/40 hover:bg-sc-raised transition-all duration-150 flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-sc-bright truncate">{project.name}</h3>
                    <p className="text-xs text-sc-muted mt-0.5 truncate">{project.clientName}</p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded-md px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusBadge[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-sc-muted">Progress</span>
                    <span className="font-mono font-semibold text-sc-amber">{project.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-sc-raised overflow-hidden">
                    <div className="h-full rounded-full bg-sc-amber transition-all" style={{ width: `${project.progress ?? 0}%` }} />
                  </div>
                </div>

                {/* Budget / dates */}
                <div className="grid grid-cols-2 divide-x divide-sc-border border-t border-sc-border pt-3 text-[10px]">
                  <div className="pr-3">
                    <span className="block font-mono uppercase tracking-wider text-sc-muted">Budget</span>
                    <span className="block font-mono font-semibold text-sc-amber mt-0.5">{currency(project.budget ?? 0)}</span>
                  </div>
                  <div className="pl-3">
                    <span className="block font-mono uppercase tracking-wider text-sc-muted">Milestones</span>
                    <span className="block font-mono font-semibold text-sc-text mt-0.5">{project.milestones?.length ?? 0} set</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalProjects > pageSize && (
            <div className="flex items-center justify-center gap-3">
              <button disabled={page <= 1} onClick={() => void loadProjects(page - 1)}
                className="h-8 rounded-md border border-sc-border bg-sc-surface px-3 text-xs text-sc-sub disabled:opacity-40 hover:bg-sc-raised transition">
                Prev
              </button>
              <span className="font-mono text-[10px] text-sc-muted">Page {page}</span>
              <button disabled={page * pageSize >= totalProjects} onClick={() => void loadProjects(page + 1)}
                className="h-8 rounded-md border border-sc-border bg-sc-surface px-3 text-xs text-sc-sub disabled:opacity-40 hover:bg-sc-raised transition">
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Create Project Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <Modal title="New Project" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateProject} id="create-project-form" className="space-y-4">
            <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            <TextField label="Budget" type="number" min="0" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextField label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <TextField label="Site address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button type="submit" className="w-full h-9 text-sm">Create project</Button>
          </form>
        </Modal>
      )}

      {/* ── Create From Quotation Modal ──────────────────────────────────── */}
      {showFromQuoteModal && (
        <Modal title="Project from Quotation" onClose={() => setShowFromQuoteModal(false)}>
          <form onSubmit={handleCreateFromQuote} id="from-quote-form" className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sc-sub">Select accepted quotation</label>
              <select className={SC_SELECT} value={selectedQuotationId} onChange={(e) => setSelectedQuotationId(e.target.value)} required>
                <option value="">Select quotation...</option>
                {acceptedQuotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotationNumber} — {q.leadClientName ?? q.leadId}
                  </option>
                ))}
              </select>
            </div>
            {acceptedQuotations.length === 0 && (
              <p className="text-xs text-sc-muted">No accepted quotations available. Accept a quotation first.</p>
            )}
            <Button type="submit" className="w-full h-9 text-sm" disabled={!selectedQuotationId}>
              Create from quotation
            </Button>
          </form>
        </Modal>
      )}

      {/* ── Project Detail Drawer ────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={() => setSelected(null)}>
          <aside
            className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-sc-panel border-l border-sc-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="sticky top-0 z-10 border-b border-sc-border bg-sc-panel px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-sc-bright">{selected.name}</h2>
                <p className="font-mono text-[10px] text-sc-muted mt-0.5">{selected.clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-sc-border bg-sc-surface px-2.5 py-1.5 text-xs font-medium text-sc-sub hover:text-sc-text transition"
              >
                Close
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6">

              {/* Metrics strip */}
              <div className="grid grid-cols-3 divide-x divide-sc-border rounded-md border border-sc-border overflow-hidden">
                <div className="p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-sc-muted block">Status</span>
                  <span className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusBadge[selected.status]}`}>
                    {statusLabels[selected.status]}
                  </span>
                </div>
                <div className="p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-sc-muted block">Budget</span>
                  <span className="font-mono text-sm font-semibold text-sc-amber mt-1.5 block">{currency(selected.budget ?? 0)}</span>
                </div>
                <div className="p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-sc-muted block">Progress</span>
                  <span className="font-mono text-sm font-semibold text-sc-text mt-1.5 block">{selected.progress ?? 0}%</span>
                </div>
              </div>

              {/* Status + Progress controls */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sc-muted">Update status</label>
                  <select className={SC_SELECT} value={selected.status} onChange={(e) => void handleUpdateStatus(selected, e.target.value as ProjectStatus)}>
                    {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-sc-muted">Progress ({selected.progress ?? 0}%)</label>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={selected.progress ?? 0}
                    onChange={(e) => void handleUpdateProgress(selected, Number(e.target.value))}
                    className="accent-sc-amber"
                  />
                </div>
              </div>

              {/* Site address */}
              {selected.address && (
                <div className="flex gap-2 text-xs text-sc-muted">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-sc-amber" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {selected.address}
                </div>
              )}

              {/* Actions */}
              {isOwnerOrAdmin && (
                <div className="flex gap-2">
                  <Button variant="danger" onClick={() => void handleRemoveProject(selected)} className="h-8 px-3 text-xs">
                    Delete project
                  </Button>
                </div>
              )}

              {/* Milestones */}
              <section className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">Milestones</h3>
                {selected.milestones && selected.milestones.length > 0 ? (
                  <div className="divide-y divide-sc-border border-y border-sc-border">
                    {selected.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => void handleToggleMilestone(m.id, m.status)}
                          className={`h-4 w-4 shrink-0 rounded border transition ${m.status === 'completed' ? 'bg-sc-green border-sc-green' : 'border-sc-border2 bg-sc-surface'}`}
                          aria-label={m.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {m.status === 'completed' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${m.status === 'completed' ? 'line-through text-sc-muted' : 'text-sc-text'}`}>{m.title}</span>
                          {m.dueDate && <span className="block font-mono text-[10px] text-sc-muted">{new Date(m.dueDate).toLocaleDateString()}</span>}
                        </div>
                        <button type="button" onClick={() => void handleDeleteMilestone(m.id)} className="text-sc-muted hover:text-red-400 transition text-xs px-1">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-sc-muted">No milestones set.</p>
                )}
                {isManager && (
                  <form onSubmit={handleAddMilestone} id="add-milestone-form" className="flex gap-2 pt-1">
                    <input
                      placeholder="Milestone title"
                      value={milestoneTitle}
                      onChange={(e) => setMilestoneTitle(e.target.value)}
                      required
                      className="flex-1 h-8 rounded-md border border-sc-border bg-sc-surface px-3 text-xs text-sc-text placeholder:text-sc-muted focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30"
                    />
                    <input
                      type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)}
                      className="w-32 h-8 rounded-md border border-sc-border bg-sc-surface px-2 text-xs text-sc-text focus:outline-none focus:border-sc-amber"
                    />
                    <button type="submit" className="h-8 rounded-md bg-sc-amber px-3 text-xs font-semibold text-sc-base hover:bg-sc-amber-h transition">Add</button>
                  </form>
                )}
              </section>

              {/* Assignments */}
              <section className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">Team Assignments</h3>
                {selected.assignments && selected.assignments.length > 0 ? (
                  <div className="divide-y divide-sc-border border-y border-sc-border">
                    {selected.assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <span className="text-xs font-medium text-sc-text">{a.userName ?? a.userId}</span>
                          <span className="block font-mono text-[10px] text-sc-muted capitalize">{a.roleOnProject}</span>
                        </div>
                        {isManager && (
                          <button type="button" onClick={() => void handleRemoveAssignment(a.id)} className="text-xs text-sc-muted hover:text-red-400 transition px-1">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-sc-muted">No team members assigned.</p>
                )}
                {isManager && (
                  <form onSubmit={handleAddAssignment} id="add-assignment-form" className="space-y-2 pt-1">
                    <select className={SC_SELECT} value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                      <option value="">Select team member...</option>
                      {activeUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input
                        placeholder="Role on project"
                        value={assigneeRole} onChange={(e) => setAssigneeRole(e.target.value)}
                        className="flex-1 h-8 rounded-md border border-sc-border bg-sc-surface px-3 text-xs text-sc-text placeholder:text-sc-muted focus:outline-none focus:border-sc-amber focus:ring-2 focus:ring-sc-amber/30"
                      />
                      <button type="submit" className="h-8 rounded-md bg-sc-amber px-3 text-xs font-semibold text-sc-base hover:bg-sc-amber-h transition">Assign</button>
                    </div>
                  </form>
                )}
              </section>

              {/* Activity log */}
              <section className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-sc-muted">Activity</h3>
                {activities.length ? (
                  <div className="divide-y divide-sc-border border-y border-sc-border">
                    {activities.map((a) => (
                      <div key={a.id} className="py-2.5 space-y-0.5">
                        <span className="text-xs font-medium text-sc-text capitalize">{a.action.replaceAll('_', ' ')}</span>
                        <span className="block font-mono text-[10px] text-sc-muted">{a.userName ?? 'System'} · {new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-sc-muted">No activity recorded.</p>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
