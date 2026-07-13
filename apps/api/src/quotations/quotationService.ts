import type { AuthUser, CreateQuotationRequest, QuotationStatus, UpdateQuotationRequest } from '@construction-crm/shared-types';
import { AppError, forbidden } from '../auth/errors.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { QuotationStore } from './quotationStore.js';

const managers = ['owner', 'admin', 'manager'] as const;

function canManage(user: AuthUser) {
  return managers.includes(user.role as (typeof managers)[number]);
}

function assertManage(user: AuthUser) {
  if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage quotations');
}

export class QuotationService {
  constructor(
    private readonly quotations: QuotationStore,
    private readonly leads: LeadStore,
  ) {}

  list(user: AuthUser) {
    assertManage(user);
    return this.quotations.list();
  }

  async get(id: string, user: AuthUser) {
    assertManage(user);
    const quotation = await this.quotations.findById(id);
    if (!quotation) throw new AppError(404, 'Quotation not found');
    return quotation;
  }

  async create(input: CreateQuotationRequest, user: AuthUser) {
    assertManage(user);
    const lead = await this.leads.findById(input.leadId);
    if (!lead) throw new AppError(404, 'Lead not found');
    const count = await this.quotations.count();
    const quotation = await this.quotations.create({
      ...input,
      quotationNumber: `QT-${String(count + 1).padStart(5, '0')}`,
      createdBy: user.id
    });
    await this.leads.update(input.leadId, { status: 'quoted' });
    await this.leads.addActivity({
      userId: user.id,
      action: 'quotation_created',
      entityId: input.leadId,
      metadata: { quotationId: quotation.id, quotationNumber: quotation.quotationNumber }
    });
    return quotation;
  }

  async update(id: string, input: UpdateQuotationRequest, user: AuthUser) {
    assertManage(user);
    const quotation = await this.quotations.update(id, input);
    if (!quotation) throw new AppError(404, 'Quotation not found');
    return quotation;
  }

  async transition(id: string, status: QuotationStatus, user: AuthUser) {
    assertManage(user);
    const current = await this.quotations.findById(id);
    if (!current) throw new AppError(404, 'Quotation not found');
    if (current.status === 'accepted' || current.status === 'rejected') {
      throw new AppError(400, 'Finalized quotations cannot be changed');
    }
    const quotation = await this.quotations.setStatus(id, status);
    if (!quotation) throw new AppError(404, 'Quotation not found');
    await this.leads.addActivity({
      userId: user.id,
      action: 'quotation_status_changed',
      entityId: quotation.leadId,
      metadata: { quotationId: id, from: current.status, to: status }
    });
    return quotation;
  }

  async remove(id: string, user: AuthUser) {
    assertManage(user);
    const deleted = await this.quotations.delete(id);
    if (!deleted) throw new AppError(404, 'Quotation not found');
  }
}
