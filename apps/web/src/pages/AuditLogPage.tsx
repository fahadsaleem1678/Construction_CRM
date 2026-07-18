import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, FolderKanban, UsersRound } from 'lucide-react';
import { ErrorPanel, EmptyPanel, LoadingPanel } from '../components/AsyncState';
import { getLead, getProject, listLeads, listProjects } from '../lib/api';

type AuditEntry = { id: string; action: string; userName: string | null; createdAt: string; entityType: 'lead' | 'project'; entityName: string };

function formatAction(action: string) { return action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'lead' | 'project'>('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [leadPage, projectPage] = await Promise.all([listLeads({ page: 1, pageSize: 100 }), listProjects({ page: 1, pageSize: 100 })]);
      const [leadDetails, projectDetails] = await Promise.all([
        Promise.all(leadPage.leads.map(async (lead) => ({ name: lead.clientName, activities: (await getLead(lead.id)).activities }))),
        Promise.all(projectPage.projects.map(async (project) => ({ name: project.name, activities: (await getProject(project.id)).activities }))),
      ]);
      setEntries([
        ...leadDetails.flatMap(({ name, activities }) => activities.map((activity) => ({ ...activity, entityType: 'lead' as const, entityName: name }))),
        ...projectDetails.flatMap(({ name, activities }) => activities.map((activity) => ({ ...activity, entityType: 'project' as const, entityName: name }))),
      ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Request failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const visible = filter === 'all' ? entries : entries.filter((entry) => entry.entityType === filter);

  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-sc-amber">Operational history</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-sc-bright">Audit log</h2><p className="mt-2 text-sm text-sc-muted">Review recorded changes to the leads and projects visible to you.</p></div><div className="flex rounded-lg border border-sc-border-subtle bg-sc-panel p-1" aria-label="Filter audit log">{(['all', 'lead', 'project'] as const).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${filter === option ? 'bg-sc-amber/15 text-sc-amber' : 'text-sc-muted hover:text-sc-text'}`}>{option === 'all' ? 'All records' : `${option}s`}</button>)}</div></section>
    {loading ? <LoadingPanel label="Loading audit history" /> : error ? <ErrorPanel message={error} onRetry={() => void load()} /> : visible.length === 0 ? <EmptyPanel title="No recorded activity" detail="Changes to leads and projects will appear here as your team works." /> : <section className="overflow-hidden rounded-2xl border border-sc-border-subtle bg-sc-panel"><div className="divide-y divide-sc-border-subtle">{visible.map((entry) => { const Icon = entry.entityType === 'lead' ? UsersRound : FolderKanban; return <div key={entry.id} className="flex gap-4 px-5 py-4 sm:px-6"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sc-amber/10 text-sc-amber"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-sc-bright">{formatAction(entry.action)} <span className="font-normal text-sc-sub">on {entry.entityName}</span></p><p className="mt-1 text-xs text-sc-muted">{entry.userName ?? 'System'} · {new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</p></div></div>; })}</div></section>}</div>;
}
