import crypto from 'node:crypto';
import type {
  CreateQuotationRequest,
  Quotation,
  QuotationItem,
  QuotationStatus,
  UpdateQuotationRequest
} from '@construction-crm/shared-types';
import type { QuotationStore } from './quotationStore.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function totals(items: Array<{ quantity: number; unitPrice: number }>, taxRate = 0.16) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}

export class InMemoryQuotationStore implements QuotationStore {
  quotations = new Map<string, Quotation>();

  async list() {
    return { quotations: [...this.quotations.values()], total: this.quotations.size };
  }

  async findById(quotationId: string) {
    return this.quotations.get(quotationId) ?? null;
  }

  async count() {
    return this.quotations.size;
  }

  async create(input: CreateQuotationRequest & { quotationNumber: string; createdBy: string | null }) {
    const calculated = totals(input.items, input.taxRate);
    const quotationId = id();
    const items: QuotationItem[] = input.items.map((item) => ({
      id: id(),
      quotationId,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));
    const quotation: Quotation = {
      id: quotationId,
      leadId: input.leadId,
      leadClientName: null,
      quotationNumber: input.quotationNumber,
      status: 'draft',
      ...calculated,
      validUntil: input.validUntil ?? null,
      createdBy: input.createdBy,
      createdByName: null,
      createdAt: now(),
      updatedAt: now(),
      items
    };
    this.quotations.set(quotation.id, quotation);
    return quotation;
  }

  async update(quotationId: string, input: UpdateQuotationRequest) {
    const existing = this.quotations.get(quotationId);
    if (!existing) return null;
    const items = input.items
      ? input.items.map((item) => ({
          id: id(),
          quotationId,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        }))
      : existing.items;
    const calculated = totals(items, input.taxRate ?? 0.16);
    const next: Quotation = {
      ...existing,
      ...calculated,
      items,
      validUntil: input.validUntil === undefined ? existing.validUntil : input.validUntil,
      updatedAt: now()
    };
    this.quotations.set(quotationId, next);
    return next;
  }

  async setStatus(quotationId: string, status: QuotationStatus) {
    const existing = this.quotations.get(quotationId);
    if (!existing) return null;
    const next = { ...existing, status, updatedAt: now() };
    this.quotations.set(quotationId, next);
    return next;
  }

  async delete(quotationId: string) {
    return this.quotations.delete(quotationId);
  }
}
