import crypto from 'node:crypto';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@construction-crm/shared-types';
import type { CreateInvoiceInput, InvoiceListStoreQuery, InvoiceStore } from './invoiceStore.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function toStatus(total: number, amountPaid: number, currentStatus: InvoiceStatus, dueDate: string | null) {
  if (amountPaid >= total && total > 0) return 'paid' as const;
  if (amountPaid > 0) return 'partially_paid' as const;
  if ((currentStatus === 'sent' || currentStatus === 'overdue') && dueDate && new Date(dueDate).getTime() < Date.now()) return 'overdue' as const;
  return currentStatus;
}

export class InMemoryInvoiceStore implements InvoiceStore {
  private readonly invoices = new Map<string, Invoice>();

  async list(query: InvoiceListStoreQuery) {
    let invoices = [...this.invoices.values()];
    if (query.projectId) invoices = invoices.filter((invoice) => invoice.projectId === query.projectId);
    if (query.status) invoices = invoices.filter((invoice) => invoice.status === query.status);
    invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = invoices.length;
    const start = (query.page - 1) * query.pageSize;
    const outstandingTotal = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    return { invoices: invoices.slice(start, start + query.pageSize), total, outstandingTotal };
  }

  async findById(id: string) {
    return this.invoices.get(id) ?? null;
  }

  async create(input: CreateInvoiceInput) {
    const invoiceId = id();
    const items: InvoiceItem[] = input.items.map((item) => ({
      id: id(),
      invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));
    const amountPaid = input.amountPaid ?? 0;
    const invoice: Invoice = {
      id: invoiceId,
      projectId: input.projectId,
      projectName: input.projectName,
      clientName: input.clientName,
      invoiceNumber: input.invoiceNumber,
      status: 'draft',
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      amountPaid,
      balanceDue: Math.max(0, input.total - amountPaid),
      dueDate: input.dueDate ?? null,
      paidDate: input.paidDate ?? null,
      lastEmailedAt: null,
      lastReminderSentAt: null,
      reminderCount: 0,
      createdAt: now(),
      updatedAt: now(),
      items,
    };
    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  async setStatus(id: string, status: InvoiceStatus) {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;
    const next: Invoice = {
      ...invoice,
      status: toStatus(invoice.total, invoice.amountPaid, status, invoice.dueDate),
      updatedAt: now(),
    };
    this.invoices.set(id, next);
    return next;
  }

  async recordPayment(id: string, amountPaid: number, paidDate: string | null) {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;
    const next: Invoice = {
      ...invoice,
      amountPaid,
      balanceDue: Math.max(0, invoice.total - amountPaid),
      paidDate: amountPaid >= invoice.total ? paidDate : null,
      status: toStatus(invoice.total, amountPaid, invoice.status === 'draft' ? 'sent' : invoice.status, invoice.dueDate),
      updatedAt: now(),
    };
    this.invoices.set(id, next);
    return next;
  }

  async markEmailed(id: string, sentAt: string) {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;
    const next: Invoice = {
      ...invoice,
      lastEmailedAt: sentAt,
      updatedAt: now(),
    };
    this.invoices.set(id, next);
    return next;
  }

  async markReminderSent(id: string, sentAt: string) {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;
    const next: Invoice = {
      ...invoice,
      lastReminderSentAt: sentAt,
      reminderCount: invoice.reminderCount + 1,
      updatedAt: now(),
    };
    this.invoices.set(id, next);
    return next;
  }

  async listReminderCandidates(referenceDate: Date) {
    const nowMs = referenceDate.getTime();
    return [...this.invoices.values()].filter((invoice) => {
      if (invoice.status !== 'overdue' && invoice.status !== 'sent' && invoice.status !== 'partially_paid') return false;
      if (!invoice.dueDate || new Date(invoice.dueDate).getTime() >= nowMs) return false;
      if (!invoice.lastReminderSentAt) return true;
      return nowMs - new Date(invoice.lastReminderSentAt).getTime() >= 1000 * 60 * 60 * 24;
    });
  }

  async count() {
    return this.invoices.size;
  }

  async syncOverdue() {
    for (const [key, invoice] of this.invoices) {
      const nextStatus = toStatus(invoice.total, invoice.amountPaid, invoice.status, invoice.dueDate);
      if (nextStatus !== invoice.status) {
        this.invoices.set(key, { ...invoice, status: nextStatus, updatedAt: now() });
      }
    }
  }
}
