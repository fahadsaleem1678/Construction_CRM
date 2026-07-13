import crypto from 'node:crypto';
import type { CreateLeadRequest, Lead, LeadActivity, UpdateLeadRequest } from '@construction-crm/shared-types';
import type { LeadListStoreQuery, LeadStore } from './leadStore.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export class InMemoryLeadStore implements LeadStore {
  leads = new Map<string, Lead>();
  activityRows: LeadActivity[] = [];

  async list(query: LeadListStoreQuery) {
    let leads = [...this.leads.values()];
    if (query.visibleAssignedTo) leads = leads.filter((lead) => lead.assignedTo === query.visibleAssignedTo);
    if (query.status) leads = leads.filter((lead) => lead.status === query.status);
    if (query.source) leads = leads.filter((lead) => lead.source === query.source);
    if (query.assignedTo) leads = leads.filter((lead) => lead.assignedTo === query.assignedTo);
    leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = leads.length;
    const start = (query.page - 1) * query.pageSize;
    return { leads: leads.slice(start, start + query.pageSize), total };
  }

  async findById(leadId: string) {
    return this.leads.get(leadId) ?? null;
  }

  async create(input: CreateLeadRequest) {
    const lead: Lead = {
      id: id(),
      clientName: input.clientName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail ?? null,
      source: input.source,
      status: input.status ?? 'new',
      estimatedValue: input.estimatedValue ?? 0,
      assignedTo: input.assignedTo ?? null,
      assignedUserName: null,
      notes: input.notes ?? null,
      createdAt: now(),
      updatedAt: now()
    };
    this.leads.set(lead.id, lead);
    return lead;
  }

  async update(leadId: string, input: UpdateLeadRequest) {
    const existing = this.leads.get(leadId);
    if (!existing) return null;
    const next: Lead = {
      ...existing,
      ...input,
      contactEmail: input.contactEmail === undefined ? existing.contactEmail : input.contactEmail,
      assignedTo: input.assignedTo === undefined ? existing.assignedTo : input.assignedTo,
      notes: input.notes === undefined ? existing.notes : input.notes,
      updatedAt: now()
    };
    this.leads.set(leadId, next);
    return next;
  }

  async delete(leadId: string) {
    return this.leads.delete(leadId);
  }

  async activities(leadId: string) {
    return this.activityRows.filter((activity) => activity.entityId === leadId).slice().reverse();
  }

  async addActivity(input: { userId: string | null; action: string; entityId: string; metadata: Record<string, unknown> }) {
    this.activityRows.push({
      id: id(),
      userName: input.userId,
      action: input.action,
      entityType: 'lead',
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: now()
    });
  }
}
