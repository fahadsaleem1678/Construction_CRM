import type {
  DashboardAlert,
  DashboardAnalyticsAccess,
  DashboardAnalyticsResponse,
  DashboardExpenseBucket,
  DashboardLeadBucket,
  DashboardProjectBucket,
  DashboardProjectSpotlight,
  DashboardRevenuePoint,
  DashboardSummary,
  DashboardUpcomingMilestone,
  Expense,
  Invoice,
  Lead,
  Project,
  UserRole,
} from '@construction-crm/shared-types';
import { expenseCategories, leadStatuses, projectStatuses } from '@construction-crm/shared-types';
import type { ExpenseStore } from '../expenses/expenseStore.js';
import type { InvoiceStore } from '../invoices/invoiceStore.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { ProjectStore } from '../projects/projectStore.js';
import type { AnalyticsStore, DashboardAnalyticsQuery } from './analyticsStore.js';

const MAX_PAGE_SIZE = 1000;
const ACTIVE_LEAD_STATUSES = new Set<Lead['status']>(['new', 'contacted', 'site_visit', 'quoted']);
const ACTIVE_PROJECT_STATUSES = new Set<Project['status']>(['planning', 'in_progress', 'on_hold']);

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
}

function parseIsoDate(value: string | null) {
  return value ? new Date(value) : null;
}

function daysUntil(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const target = new Date(value);
  return Math.ceil((target.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
}

function dashboardAccess(role: UserRole): DashboardAnalyticsAccess {
  if (role === 'employee') {
    return {
      leads: true,
      invoices: false,
      financials: false,
      assignedOnly: true,
    };
  }

  if (role === 'accountant') {
    return {
      leads: false,
      invoices: true,
      financials: true,
      assignedOnly: false,
    };
  }

  if (role === 'manager') {
    return {
      leads: true,
      invoices: false,
      financials: false,
      assignedOnly: false,
    };
  }

  return {
    leads: true,
    invoices: true,
    financials: true,
    assignedOnly: false,
  };
}

function emptySummary(): DashboardSummary {
  return {
    activeLeadCount: 0,
    pipelineValue: 0,
    activeProjectCount: 0,
    completedProjectCount: 0,
    overdueInvoiceCount: 0,
    outstandingBalance: 0,
    collectedRevenue: 0,
    approvedExpenseTotal: 0,
    pendingExpenseCount: 0,
    dueSoonMilestoneCount: 0,
  };
}

export class ComposedAnalyticsStore implements AnalyticsStore {
  constructor(
    private readonly leads: LeadStore,
    private readonly projects: ProjectStore,
    private readonly expenses: ExpenseStore,
    private readonly invoices: InvoiceStore,
  ) {}

  async getDashboard(query: DashboardAnalyticsQuery): Promise<DashboardAnalyticsResponse> {
    const access = dashboardAccess(query.viewerRole);
    const months = Math.max(3, Math.min(12, Math.trunc(query.months) || 6));

    const [leadResult, projectResult, expenseResult, invoiceResult] = await Promise.all([
      access.leads
        ? this.leads.list({
            page: 1,
            pageSize: MAX_PAGE_SIZE,
            visibleAssignedTo: access.assignedOnly ? query.viewerId : undefined,
          })
        : Promise.resolve({ leads: [] as Lead[], total: 0 }),
      this.projects.list({
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        visibleUserId: access.assignedOnly ? query.viewerId : undefined,
      }),
      this.expenses.listExpenses({ page: 1, pageSize: MAX_PAGE_SIZE }),
      access.invoices
        ? this.loadInvoices()
        : Promise.resolve({ invoices: [] as Invoice[], total: 0, outstandingTotal: 0 }),
    ]);

    const visibleLeads = leadResult.leads;
    const visibleProjects = projectResult.projects;
    const visibleExpenses = access.assignedOnly
      ? expenseResult.expenses.filter((expense) => expense.submittedBy === query.viewerId)
      : expenseResult.expenses;
    const visibleInvoices = invoiceResult.invoices;
    const approvedExpenses = visibleExpenses.filter((expense) => expense.status === 'approved');
    const referenceDate = new Date();

    const summary = this.buildSummary(
      visibleLeads,
      visibleProjects,
      visibleInvoices,
      approvedExpenses,
      visibleExpenses,
      referenceDate,
    );

    const leadBuckets = access.leads ? this.buildLeadBuckets(visibleLeads) : [];
    const projectBuckets = this.buildProjectBuckets(visibleProjects);
    const expenseBuckets = access.financials ? this.buildExpenseBuckets(approvedExpenses) : [];
    const revenueSeries = access.financials
      ? this.buildRevenueSeries(visibleInvoices, approvedExpenses, months, referenceDate)
      : [];
    const upcomingMilestones = this.buildUpcomingMilestones(visibleProjects, referenceDate);
    const spotlightProjects = this.buildSpotlightProjects(visibleProjects, approvedExpenses);
    const alerts = this.buildAlerts({
      access,
      leads: visibleLeads,
      projects: visibleProjects,
      invoices: visibleInvoices,
      expenses: visibleExpenses,
      summary,
      referenceDate,
    });

    return {
      viewerRole: query.viewerRole,
      scope: access.assignedOnly ? 'assigned' : 'global',
      generatedAt: new Date().toISOString(),
      access,
      summary,
      leadBuckets,
      projectBuckets,
      expenseBuckets,
      revenueSeries,
      upcomingMilestones,
      spotlightProjects,
      alerts,
    };
  }

  private async loadInvoices() {
    await this.invoices.syncOverdue();
    return this.invoices.list({ page: 1, pageSize: MAX_PAGE_SIZE });
  }

  private buildSummary(
    leads: Lead[],
    projects: Project[],
    invoices: Invoice[],
    approvedExpenses: Expense[],
    expenses: Expense[],
    referenceDate: Date,
  ): DashboardSummary {
    const summary = emptySummary();
    summary.activeLeadCount = leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status)).length;
    summary.pipelineValue = leads
      .filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status))
      .reduce((sum, lead) => sum + lead.estimatedValue, 0);
    summary.activeProjectCount = projects.filter((project) => ACTIVE_PROJECT_STATUSES.has(project.status)).length;
    summary.completedProjectCount = projects.filter((project) => project.status === 'completed').length;
    summary.overdueInvoiceCount = invoices.filter((invoice) => invoice.status === 'overdue').length;
    summary.outstandingBalance = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    summary.collectedRevenue = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    summary.approvedExpenseTotal = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    summary.pendingExpenseCount = expenses.filter((expense) => expense.status === 'pending').length;
    summary.dueSoonMilestoneCount = projects
      .flatMap((project) => project.milestones.map((milestone) => ({ milestone, project })))
      .filter(({ milestone }) => milestone.status !== 'completed')
      .filter(({ milestone }) => {
        const dueInDays = daysUntil(milestone.dueDate, referenceDate);
        return dueInDays !== null && dueInDays >= 0 && dueInDays <= 14;
      }).length;

    return summary;
  }

  private buildLeadBuckets(leads: Lead[]): DashboardLeadBucket[] {
    return (leadStatuses as readonly Lead['status'][]).map((status) => {
      const matches = leads.filter((lead) => lead.status === status);
      return {
        status,
        count: matches.length,
        estimatedValue: matches.reduce((sum, lead) => sum + lead.estimatedValue, 0),
      };
    });
  }

  private buildProjectBuckets(projects: Project[]): DashboardProjectBucket[] {
    return (projectStatuses as readonly Project['status'][]).map((status) => ({
      status,
      count: projects.filter((project) => project.status === status).length,
    }));
  }

  private buildExpenseBuckets(expenses: Expense[]): DashboardExpenseBucket[] {
    return (expenseCategories as readonly Expense['category'][]).map((category) => {
      const matches = expenses.filter((expense) => expense.category === category);
      return {
        category,
        count: matches.length,
        total: matches.reduce((sum, expense) => sum + expense.amount, 0),
      };
    });
  }

  private buildRevenueSeries(
    invoices: Invoice[],
    approvedExpenses: Expense[],
    months: number,
    referenceDate: Date,
  ): DashboardRevenuePoint[] {
    const end = startOfMonth(referenceDate);
    const start = addMonths(end, -(months - 1));
    const points = new Map<string, DashboardRevenuePoint>();

    for (let index = 0; index < months; index += 1) {
      const date = addMonths(start, index);
      points.set(monthKey(date), {
        label: monthLabel(date),
        invoiceTotal: 0,
        collectedTotal: 0,
        approvedExpenseTotal: 0,
      });
    }

    for (const invoice of invoices) {
      const createdKey = monthKey(new Date(invoice.createdAt));
      if (points.has(createdKey)) {
        points.get(createdKey)!.invoiceTotal += invoice.total;
      }

      const paidDate = parseIsoDate(invoice.paidDate);
      if (paidDate) {
        const paidKey = monthKey(paidDate);
        if (points.has(paidKey)) {
          points.get(paidKey)!.collectedTotal += invoice.amountPaid;
        }
      }
    }

    for (const expense of approvedExpenses) {
      const expenseKey = monthKey(new Date(expense.expenseDate));
      if (points.has(expenseKey)) {
        points.get(expenseKey)!.approvedExpenseTotal += expense.amount;
      }
    }

    return [...points.values()];
  }

  private buildUpcomingMilestones(projects: Project[], referenceDate: Date): DashboardUpcomingMilestone[] {
    return projects
      .flatMap((project) =>
        project.milestones.map((milestone) => ({
          id: milestone.id,
          projectId: project.id,
          projectName: project.name,
          title: milestone.title,
          dueDate: milestone.dueDate,
          status: milestone.status,
          progress: project.progress,
        })),
      )
      .filter((milestone) => milestone.status !== 'completed' && milestone.dueDate)
      .sort((left, right) => new Date(left.dueDate!).getTime() - new Date(right.dueDate!).getTime())
      .filter((milestone) => {
        const dueInDays = daysUntil(milestone.dueDate, referenceDate);
        return dueInDays !== null && dueInDays >= -3;
      })
      .slice(0, 6);
  }

  private buildSpotlightProjects(projects: Project[], approvedExpenses: Expense[]): DashboardProjectSpotlight[] {
    const spentByProject = new Map<string, number>();
    for (const expense of approvedExpenses) {
      if (!expense.projectId) continue;
      spentByProject.set(expense.projectId, (spentByProject.get(expense.projectId) ?? 0) + expense.amount);
    }

    return [...projects]
      .sort((left, right) => {
        const leftActive = ACTIVE_PROJECT_STATUSES.has(left.status) ? 1 : 0;
        const rightActive = ACTIVE_PROJECT_STATUSES.has(right.status) ? 1 : 0;
        if (leftActive !== rightActive) return rightActive - leftActive;
        if (left.progress !== right.progress) return right.progress - left.progress;
        return right.updatedAt.localeCompare(left.updatedAt);
      })
      .slice(0, 4)
      .map((project) => ({
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        status: project.status,
        progress: project.progress,
        budget: project.budget,
        spent: spentByProject.get(project.id) ?? 0,
        assignmentCount: project.assignments.length,
        openMilestones: project.milestones.filter((milestone) => milestone.status !== 'completed').length,
        completedMilestones: project.milestones.filter((milestone) => milestone.status === 'completed').length,
      }));
  }

  private buildAlerts(input: {
    access: DashboardAnalyticsAccess;
    leads: Lead[];
    projects: Project[];
    invoices: Invoice[];
    expenses: Expense[];
    summary: DashboardSummary;
    referenceDate: Date;
  }): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    if (input.access.invoices && input.summary.overdueInvoiceCount > 0) {
      alerts.push({
        id: 'overdue-invoices',
        tone: 'warning',
        title: `${input.summary.overdueInvoiceCount} overdue invoice${input.summary.overdueInvoiceCount === 1 ? '' : 's'}`,
        detail: `Outstanding balance is ${input.summary.outstandingBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`,
        href: '/invoices',
      });
    }

    if (input.summary.pendingExpenseCount > 0) {
      alerts.push({
        id: 'pending-expenses',
        tone: 'info',
        title: `${input.summary.pendingExpenseCount} expense submission${input.summary.pendingExpenseCount === 1 ? '' : 's'} waiting`,
        detail: 'Finance and operations can clear the pending queue from the expense workspace.',
        href: '/expenses',
      });
    }

    const dueSoon = input.projects
      .flatMap((project) => project.milestones.map((milestone) => ({ milestone, project })))
      .filter(({ milestone }) => milestone.status !== 'completed')
      .filter(({ milestone }) => {
        const dueInDays = daysUntil(milestone.dueDate, input.referenceDate);
        return dueInDays !== null && dueInDays >= 0 && dueInDays <= 7;
      }).length;

    if (dueSoon > 0) {
      alerts.push({
        id: 'due-milestones',
        tone: 'info',
        title: `${dueSoon} milestone${dueSoon === 1 ? '' : 's'} due this week`,
        detail: 'Keep the project board moving before site work slips.',
        href: '/projects',
      });
    }

    if (input.access.leads) {
      const unassignedLeads = input.leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status) && !lead.assignedTo).length;
      if (unassignedLeads > 0) {
        alerts.push({
          id: 'unassigned-leads',
          tone: 'warning',
          title: `${unassignedLeads} active lead${unassignedLeads === 1 ? '' : 's'} unassigned`,
          detail: 'Assign ownership so follow-up does not stall between site visits and quoting.',
          href: '/leads',
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'steady-state',
        tone: 'success',
        title: 'No urgent blockers right now',
        detail: 'The current dashboard snapshot does not show overdue billing, pending approvals, or slipping milestones.',
        href: null,
      });
    }

    return alerts.slice(0, 4);
  }
}
