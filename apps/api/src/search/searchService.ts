import type { AuthUser, GlobalSearchResult } from '@construction-crm/shared-types';
import type { InvoiceStore } from '../invoices/invoiceStore.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { ProjectStore } from '../projects/projectStore.js';

type ScoredResult = GlobalSearchResult & { score: number };

const SEARCH_PAGE_SIZE = 200;

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase();
}

function matchScore(query: string, fields: Array<{ name: string; value: string | null | undefined }>) {
  let best: { field: string; score: number } | null = null;

  for (const field of fields) {
    const value = normalize(field.value);
    if (!value) continue;

    let score = 0;
    if (value === query) score = 100;
    else if (value.startsWith(query)) score = 80;
    else if (value.includes(query)) score = 50;

    if (score > (best?.score ?? 0)) {
      best = { field: field.name, score };
    }
  }

  return best;
}

function sortResults(a: ScoredResult, b: ScoredResult) {
  if (b.score !== a.score) return b.score - a.score;
  return a.title.localeCompare(b.title);
}

function canSearchLeads(user: AuthUser) {
  return user.role !== 'accountant';
}

function canSearchProjects(user: AuthUser) {
  return true;
}

function canSearchInvoices(user: AuthUser) {
  return ['owner', 'admin', 'accountant', 'manager'].includes(user.role);
}

export class SearchService {
  constructor(
    private readonly leads: LeadStore,
    private readonly projects: ProjectStore,
    private readonly invoices: InvoiceStore,
  ) {}

  async search(user: AuthUser, rawQuery: string, limit: number) {
    const query = rawQuery.trim().toLowerCase();
    if (query.length < 2) {
      return { query: rawQuery.trim(), results: [] };
    }

    const [leadResults, projectResults, invoiceResults] = await Promise.all([
      canSearchLeads(user) ? this.searchLeads(user, query) : Promise.resolve([]),
      canSearchProjects(user) ? this.searchProjects(user, query) : Promise.resolve([]),
      canSearchInvoices(user) ? this.searchInvoices(query) : Promise.resolve([]),
    ]);

    const results = [...leadResults, ...projectResults, ...invoiceResults]
      .sort(sortResults)
      .slice(0, limit)
      .map(({ score: _score, ...result }) => result);

    return { query: rawQuery.trim(), results };
  }

  private async searchLeads(user: AuthUser, query: string): Promise<ScoredResult[]> {
    const { leads } = await this.leads.list({
      page: 1,
      pageSize: SEARCH_PAGE_SIZE,
      visibleAssignedTo: user.role === 'employee' ? user.id : undefined,
    });

    return leads.flatMap((lead) => {
      const match = matchScore(query, [
        { name: 'client name', value: lead.clientName },
        { name: 'phone', value: lead.contactPhone },
        { name: 'email', value: lead.contactEmail },
        { name: 'status', value: lead.status },
      ]);

      if (!match) return [];

      return [{
        id: lead.id,
        type: 'lead',
        title: lead.clientName,
        subtitle: `${lead.contactPhone} · ${lead.source.replace('_', ' ')}`,
        status: lead.status,
        href: `/leads?focus=${lead.id}`,
        matchedField: match.field,
        score: match.score,
      }];
    });
  }

  private async searchProjects(user: AuthUser, query: string): Promise<ScoredResult[]> {
    const { projects } = await this.projects.list({
      page: 1,
      pageSize: SEARCH_PAGE_SIZE,
      visibleUserId: user.role === 'employee' ? user.id : undefined,
    });

    return projects.flatMap((project) => {
      const match = matchScore(query, [
        { name: 'project name', value: project.name },
        { name: 'client name', value: project.clientName },
        { name: 'status', value: project.status },
        { name: 'address', value: project.address },
      ]);

      if (!match) return [];

      return [{
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: `${project.clientName} · ${project.progress}% complete`,
        status: project.status,
        href: `/projects?focus=${project.id}`,
        matchedField: match.field,
        score: match.score,
      }];
    });
  }

  private async searchInvoices(query: string): Promise<ScoredResult[]> {
    await this.invoices.syncOverdue();
    const { invoices } = await this.invoices.list({ page: 1, pageSize: SEARCH_PAGE_SIZE });

    return invoices.flatMap((invoice) => {
      const match = matchScore(query, [
        { name: 'invoice number', value: invoice.invoiceNumber },
        { name: 'client name', value: invoice.clientName },
        { name: 'project name', value: invoice.projectName },
        { name: 'status', value: invoice.status },
      ]);

      if (!match) return [];

      return [{
        id: invoice.id,
        type: 'invoice',
        title: invoice.invoiceNumber,
        subtitle: `${invoice.clientName} · Rs ${invoice.balanceDue.toLocaleString()} due`,
        status: invoice.status,
        href: `/invoices?focus=${invoice.id}`,
        matchedField: match.field,
        score: match.score,
      }];
    });
  }
}
