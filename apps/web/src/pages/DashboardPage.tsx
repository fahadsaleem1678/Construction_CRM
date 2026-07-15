import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AlertTriangle, ArrowRight, Banknote, BriefcaseBusiness, CalendarClock, CheckCircle2, CircleDollarSign, FileWarning, FolderKanban, TrendingUp } from 'lucide-react';
import type {
  DashboardAlert,
  DashboardAnalyticsResponse,
  DashboardExpenseBucket,
  DashboardLeadBucket,
  DashboardProjectBucket,
  DashboardProjectSpotlight,
  DashboardRevenuePoint,
  DashboardUpcomingMilestone,
} from '@construction-crm/shared-types';
import { Link } from 'react-router-dom';
import { ActivityStrip } from '../components/ActivityStrip';
import { getDashboardAnalytics } from '../lib/api';

const RANGE_OPTIONS = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatRelativeDate(value: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(date);
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function toneClasses(tone: DashboardAlert['tone']) {
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
  return 'border-sky-400/30 bg-sky-500/10 text-sky-100';
}

function SummaryCard(props: { label: string; value: string; detail: string; icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }> }) {
  const Icon = props.icon;
  return (
    <div className="sc-page-card min-h-[148px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sc-muted">{props.label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-sc-bright">{props.value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sc-amber/10 text-sc-amber">
          <Icon size={20} strokeWidth={1.8} aria-hidden />
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-sc-muted">{props.detail}</p>
    </div>
  );
}

function StatusBars(props: { title: string; caption: string; items: { label: string; count: number; value?: number }[]; accent?: 'amber' | 'sky' | 'emerald' }) {
  const max = Math.max(1, ...props.items.map((item) => item.count));
  const accentClass = props.accent === 'sky' ? 'bg-sky-400' : props.accent === 'emerald' ? 'bg-emerald-400' : 'bg-sc-amber';

  return (
    <section className="sc-page-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-sc-bright">{props.title}</h3>
          <p className="mt-1 text-sm text-sc-muted">{props.caption}</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {props.items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sc-text">{item.label}</span>
                {item.value !== undefined && <span className="text-xs text-sc-muted">{formatCurrency(item.value)}</span>}
              </div>
              <span className="text-sc-sub">{item.count}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-sc-surface">
              <div className={`h-full rounded-full ${accentClass}`} style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendPanel({ series }: { series: DashboardRevenuePoint[] }) {
  const max = Math.max(
    1,
    ...series.flatMap((point) => [point.invoiceTotal, point.collectedTotal, point.approvedExpenseTotal]),
  );

  return (
    <section className="sc-page-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-sc-bright">Revenue and spend trend</h3>
          <p className="mt-1 text-sm text-sc-muted">Booked invoices, collected cash, and approved project costs across the selected range.</p>
        </div>
        <div className="hidden items-center gap-4 text-xs text-sc-muted sm:flex">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sc-amber" />Invoices</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Collected</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Expenses</span>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:gap-4">
        {series.map((point) => (
          <div key={point.label} className="flex min-h-[220px] flex-col items-center justify-end rounded-2xl border border-sc-border-subtle bg-[#17181a] px-3 py-4">
            <div className="flex h-[150px] items-end gap-1">
              <div className="w-3 rounded-full bg-sc-amber" style={{ height: `${Math.max(point.invoiceTotal > 0 ? 14 : 0, (point.invoiceTotal / max) * 130)}px` }} />
              <div className="w-3 rounded-full bg-emerald-400" style={{ height: `${Math.max(point.collectedTotal > 0 ? 14 : 0, (point.collectedTotal / max) * 130)}px` }} />
              <div className="w-3 rounded-full bg-sky-400" style={{ height: `${Math.max(point.approvedExpenseTotal > 0 ? 14 : 0, (point.approvedExpenseTotal / max) * 130)}px` }} />
            </div>
            <p className="mt-4 text-sm font-medium text-sc-text">{point.label}</p>
            <p className="mt-1 text-[11px] text-sc-muted">{formatCurrency(point.collectedTotal)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <section className="sc-page-card p-5 sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight text-sc-bright">Signals to act on</h3>
      <div className="mt-5 space-y-3">
        {alerts.map((alert) => {
          const content = (
            <div className={`rounded-2xl border p-4 ${toneClasses(alert.tone)}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm opacity-85">{alert.detail}</p>
                </div>
                {alert.tone === 'warning' ? <AlertTriangle size={18} strokeWidth={1.8} aria-hidden /> : <CheckCircle2 size={18} strokeWidth={1.8} aria-hidden />}
              </div>
            </div>
          );

          return alert.href ? (
            <Link key={alert.id} to={alert.href} className="block transition-transform hover:-translate-y-0.5">
              {content}
            </Link>
          ) : (
            <div key={alert.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [months, setMonths] = useState<number>(6);
  const [snapshot, setSnapshot] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await getDashboardAnalytics(months);
        if (!cancelled) {
          setSnapshot(response);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load dashboard analytics');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [months]);

  const summaryCards = useMemo(() => {
    if (!snapshot) return [];

    if (snapshot.viewerRole === 'employee') {
      return [
        { label: 'Assigned leads', value: String(snapshot.summary.activeLeadCount), detail: 'Opportunities currently assigned to you.', icon: FolderKanban },
        { label: 'Assigned projects', value: String(snapshot.summary.activeProjectCount), detail: 'Projects where you are on the active site roster.', icon: BriefcaseBusiness },
        { label: 'Due soon', value: String(snapshot.summary.dueSoonMilestoneCount), detail: 'Milestones landing in the next two weeks.', icon: CalendarClock },
        { label: 'Expense queue', value: String(snapshot.summary.pendingExpenseCount), detail: 'Your submitted costs still waiting for approval.', icon: FileWarning },
      ];
    }

    if (snapshot.viewerRole === 'accountant') {
      return [
        { label: 'Outstanding', value: formatCurrency(snapshot.summary.outstandingBalance), detail: 'Open receivables still sitting on client invoices.', icon: CircleDollarSign },
        { label: 'Overdue invoices', value: String(snapshot.summary.overdueInvoiceCount), detail: 'Invoices already past due and needing a follow-up.', icon: FileWarning },
        { label: 'Approved spend', value: formatCurrency(snapshot.summary.approvedExpenseTotal), detail: 'Approved expense value within the selected range.', icon: Banknote },
        { label: 'Collected cash', value: formatCurrency(snapshot.summary.collectedRevenue), detail: 'Payments already recorded against issued invoices.', icon: TrendingUp },
      ];
    }

    if (snapshot.viewerRole === 'manager') {
      return [
        { label: 'Active leads', value: String(snapshot.summary.activeLeadCount), detail: 'Live pipeline items that still need progress.', icon: FolderKanban },
        { label: 'Active projects', value: String(snapshot.summary.activeProjectCount), detail: 'Projects currently planning, in progress, or on hold.', icon: BriefcaseBusiness },
        { label: 'Due soon', value: String(snapshot.summary.dueSoonMilestoneCount), detail: 'Milestones approaching within the next two weeks.', icon: CalendarClock },
        { label: 'Pending expenses', value: String(snapshot.summary.pendingExpenseCount), detail: 'Submissions waiting for review and finance action.', icon: FileWarning },
      ];
    }

    return [
      { label: 'Active leads', value: String(snapshot.summary.activeLeadCount), detail: 'Open opportunities still moving toward quotation or conversion.', icon: FolderKanban },
      { label: 'Pipeline value', value: formatCurrency(snapshot.summary.pipelineValue), detail: 'Estimated value still sitting in the active lead pipeline.', icon: CircleDollarSign },
      { label: 'Overdue invoices', value: String(snapshot.summary.overdueInvoiceCount), detail: 'Billing items already beyond their due date.', icon: FileWarning },
      { label: 'Collected cash', value: formatCurrency(snapshot.summary.collectedRevenue), detail: 'Payments recorded from client invoices in the selected window.', icon: TrendingUp },
    ];
  }, [snapshot]);

  const roleStrip = useMemo(() => {
    if (!snapshot) return ['Dashboard is loading', 'Preparing live operations snapshot'];

    const scopeLabel = snapshot.scope === 'assigned' ? 'Assigned-scope view' : 'Company-wide view';
    return [
      `${titleCase(snapshot.viewerRole)} workspace`,
      scopeLabel,
      `${snapshot.spotlightProjects.length} projects in focus`,
      `${snapshot.alerts.length} signal${snapshot.alerts.length === 1 ? '' : 's'} surfaced`,
    ];
  }, [snapshot]);

  const leadBars = (snapshot?.leadBuckets ?? []).map((bucket: DashboardLeadBucket) => ({
    label: titleCase(bucket.status),
    count: bucket.count,
    value: bucket.estimatedValue,
  }));

  const projectBars = (snapshot?.projectBuckets ?? []).map((bucket: DashboardProjectBucket) => ({
    label: titleCase(bucket.status),
    count: bucket.count,
  }));

  const expenseBars = (snapshot?.expenseBuckets ?? []).map((bucket: DashboardExpenseBucket) => ({
    label: titleCase(bucket.category),
    count: bucket.count,
    value: bucket.total,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-[28px] border border-sc-border-subtle bg-[radial-gradient(circle_at_top_left,rgba(232,181,74,0.18),transparent_28%),linear-gradient(135deg,#151719_0%,#111214_55%,#1d2126_100%)] p-6 shadow-sc-panel sm:p-8">
        <div className="absolute right-[-120px] top-[-80px] h-56 w-56 rounded-full bg-sc-amber/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-[-90px] left-[-70px] h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-sc-amber">Phase 9 dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-sc-bright sm:text-4xl">
              {snapshot?.scope === 'assigned' ? 'Your projects and delivery queue' : 'Operations, finance, and delivery in one view'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sc-sub">
              {snapshot?.viewerRole === 'accountant'
                ? 'Track receivables, approved spend, and the invoices that need a nudge before cash flow slips.'
                : snapshot?.viewerRole === 'employee'
                  ? 'See the projects, milestones, and submissions that currently need your attention on site.'
                  : 'Stay on top of lead movement, project momentum, overdue billing, and the approvals that are slowing the team down.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMonths(option.value)}
                className={[
                  'rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors',
                  months === option.value
                    ? 'border-sc-amber/40 bg-sc-amber/10 text-sc-amber'
                    : 'border-sc-border-subtle bg-black/10 text-sc-sub hover:border-sc-border2 hover:text-sc-text',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ActivityStrip items={roleStrip} />

      {error ? (
        <section className="rounded-2xl border border-sc-red/30 bg-sc-red-m/35 px-5 py-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(loading ? new Array(4).fill(null) : summaryCards).map((card, index) =>
          card ? (
            <SummaryCard key={card.label} label={card.label} value={card.value} detail={card.detail} icon={card.icon} />
          ) : (
            <div key={index} className="sc-page-card min-h-[148px] animate-pulse p-5">
              <div className="h-3 w-24 rounded bg-sc-surface" />
              <div className="mt-5 h-9 w-28 rounded bg-sc-surface" />
              <div className="mt-6 h-3 w-40 rounded bg-sc-surface" />
            </div>
          ),
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-6">
          {snapshot?.access.leads ? (
            <StatusBars
              title="Lead pipeline"
              caption="Where current opportunities are sitting, plus the estimated value still in play."
              items={leadBars}
              accent="amber"
            />
          ) : null}

          <StatusBars
            title="Project load"
            caption="A quick read on delivery status across the projects you can currently see."
            items={projectBars}
            accent="sky"
          />

          {snapshot?.access.financials ? <TrendPanel series={snapshot.revenueSeries} /> : null}
        </div>

        <div className="space-y-6">
          {snapshot ? <AlertsPanel alerts={snapshot.alerts} /> : null}

          {snapshot?.access.financials ? (
            <StatusBars
              title="Expense mix"
              caption="Approved cost categories across the selected dashboard window."
              items={expenseBars}
              accent="emerald"
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="sc-page-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-sc-bright">Projects in focus</h3>
              <p className="mt-1 text-sm text-sc-muted">The live workstreams most likely to shape this week’s delivery rhythm.</p>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-sc-amber hover:text-sc-amber-h">
              Open projects <ArrowRight size={15} strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
          <div className="mt-6 grid gap-3">
            {snapshot?.spotlightProjects.map((project: DashboardProjectSpotlight) => {
              const spendRatio = project.budget > 0 ? Math.min(100, (project.spent / project.budget) * 100) : 0;
              return (
                <Link key={project.id} to="/projects" className="rounded-2xl border border-sc-border-subtle bg-[#17181a] p-4 transition-colors hover:border-sc-border2 hover:bg-sc-raised">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-sc-bright">{project.name}</p>
                      <p className="mt-1 text-sm text-sc-muted">{project.clientName}</p>
                    </div>
                    <span className="rounded-full border border-sc-border-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sc-sub">
                      {titleCase(project.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-sc-muted">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-sc-surface">
                        <div className="h-full rounded-full bg-sc-amber" style={{ width: `${Math.max(6, project.progress)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-sc-muted">
                        <span>Budget used</span>
                        <span>{project.budget > 0 ? `${Math.round(spendRatio)}%` : 'No budget'}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-sc-surface">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(spendRatio > 0 ? 6 : 0, Math.min(100, spendRatio))}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-sc-muted">
                    <span>{project.assignmentCount} assigned</span>
                    <span>{project.openMilestones} open milestones</span>
                    <span>{project.completedMilestones} completed</span>
                    <span>{formatCurrency(project.spent)} spent</span>
                  </div>
                </Link>
              );
            })}
            {!loading && snapshot?.spotlightProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sc-border-subtle bg-[#17181a] p-6 text-sm text-sc-muted">
                No projects are available yet. Create the first project to start getting delivery analytics here.
              </div>
            ) : null}
          </div>
        </section>

        <section className="sc-page-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-sc-bright">Upcoming milestones</h3>
              <p className="mt-1 text-sm text-sc-muted">The nearest due dates across the work you currently have access to.</p>
            </div>
            <CalendarClock className="text-sc-amber" size={18} strokeWidth={1.8} aria-hidden />
          </div>
          <div className="mt-6 space-y-3">
            {snapshot?.upcomingMilestones.map((milestone: DashboardUpcomingMilestone) => (
              <Link key={milestone.id} to="/projects" className="block rounded-2xl border border-sc-border-subtle bg-[#17181a] p-4 transition-colors hover:border-sc-border2 hover:bg-sc-raised">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-sc-bright">{milestone.title}</p>
                    <p className="mt-1 text-sm text-sc-muted">{milestone.projectName}</p>
                  </div>
                  <span className="rounded-full border border-sc-border-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sc-sub">
                    {titleCase(milestone.status)}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-sc-muted">
                  <span>Due {formatRelativeDate(milestone.dueDate)}</span>
                  <span>{milestone.progress}% project progress</span>
                </div>
              </Link>
            ))}
            {!loading && snapshot?.upcomingMilestones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sc-border-subtle bg-[#17181a] p-6 text-sm text-sc-muted">
                No upcoming dated milestones are on the board yet.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
