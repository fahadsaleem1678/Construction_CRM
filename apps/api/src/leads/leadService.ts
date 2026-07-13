import type {
  AuthUser,
  CreateLeadRequest,
  Lead,
  LeadListQuery,
  UpdateLeadRequest
} from '@construction-crm/shared-types';
import { AppError, forbidden } from '../auth/errors.js';
import type { LeadStore } from './leadStore.js';

const leadManagers = ['owner', 'admin', 'manager'] as const;

function canManageLeads(user: AuthUser) {
  return leadManagers.includes(user.role as (typeof leadManagers)[number]);
}

function canViewLead(user: AuthUser, lead: Lead) {
  if (canManageLeads(user)) return true;
  if (user.role === 'employee' && lead.assignedTo === user.id) return true;
  return false;
}

export class LeadService {
  constructor(private readonly store: LeadStore) {}

  async list(query: Required<Pick<LeadListQuery, 'page' | 'pageSize'>> & Omit<LeadListQuery, 'page' | 'pageSize'>, user: AuthUser) {
    if (user.role === 'accountant') {
      throw forbidden('Accountants do not have access to leads');
    }

    const visibleAssignedTo = user.role === 'employee' ? user.id : undefined;
    const { leads, total } = await this.store.list({ ...query, visibleAssignedTo });
    return {
      leads,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    };
  }

  async get(id: string, user: AuthUser) {
    const lead = await this.store.findById(id);
    if (!lead) throw new AppError(404, 'Lead not found');
    if (!canViewLead(user, lead)) throw forbidden('You can only view leads assigned to you');
    const activities = await this.store.activities(id);
    return { lead, activities };
  }

  async create(input: CreateLeadRequest, user: AuthUser) {
    if (!canManageLeads(user)) throw forbidden('Only owners, admins, and managers can create leads');
    const lead = await this.store.create(input);
    await this.store.addActivity({
      userId: user.id,
      action: 'lead_created',
      entityId: lead.id,
      metadata: { clientName: lead.clientName, status: lead.status }
    });
    return lead;
  }

  async update(id: string, input: UpdateLeadRequest, user: AuthUser) {
    if (!canManageLeads(user)) throw forbidden('Only owners, admins, and managers can update leads');
    const before = await this.store.findById(id);
    if (!before) throw new AppError(404, 'Lead not found');
    const lead = await this.store.update(id, input);
    if (!lead) throw new AppError(404, 'Lead not found');
    await this.store.addActivity({
      userId: user.id,
      action: 'lead_updated',
      entityId: lead.id,
      metadata: { previousStatus: before.status, status: lead.status }
    });
    return lead;
  }

  async delete(id: string, user: AuthUser) {
    if (!canManageLeads(user)) throw forbidden('Only owners, admins, and managers can delete leads');
    const deleted = await this.store.delete(id);
    if (!deleted) throw new AppError(404, 'Lead not found');
  }

  async startQuotation(id: string, user: AuthUser) {
    if (!canManageLeads(user)) throw forbidden('Only owners, admins, and managers can start quotations');
    const before = await this.store.findById(id);
    if (!before) throw new AppError(404, 'Lead not found');
    const lead = await this.store.update(id, { status: 'quoted' });
    if (!lead) throw new AppError(404, 'Lead not found');
    await this.store.addActivity({
      userId: user.id,
      action: 'quotation_started',
      entityId: lead.id,
      metadata: { from: before.status, to: lead.status }
    });
    return {
      lead,
      quotationDraft: {
        leadId: lead.id,
        clientName: lead.clientName,
        estimatedValue: lead.estimatedValue
      }
    };
  }
}
