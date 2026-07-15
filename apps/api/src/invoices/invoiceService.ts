import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuthUser,
  GenerateInvoiceRequest,
  InvoiceListQuery,
  InvoiceStatus,
  RecordInvoicePaymentRequest,
  SendInvoiceRequest,
} from '@construction-crm/shared-types';
import { AppError, forbidden } from '../auth/errors.js';
import type { ExpenseStore } from '../expenses/expenseStore.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { ProjectStore } from '../projects/projectStore.js';
import type { QuotationStore } from '../quotations/quotationStore.js';
import { renderInvoiceDocument } from './invoiceDocument.js';
import type { InvoiceNotifier } from './invoiceNotifier.js';
import { renderInvoicePdf } from './invoicePdf.js';
import type { InvoiceStore } from './invoiceStore.js';

const MANAGE_ROLES = ['owner', 'admin', 'accountant'] as const;
const VIEW_ROLES = ['owner', 'admin', 'accountant', 'manager'] as const;

function canManage(user: AuthUser) {
  return MANAGE_ROLES.includes(user.role as (typeof MANAGE_ROLES)[number]);
}

function canView(user: AuthUser) {
  return VIEW_ROLES.includes(user.role as (typeof VIEW_ROLES)[number]);
}

function defaultDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return due.toISOString();
}

export class InvoiceService {
  private logoDataUrlPromise: Promise<string | null> | null = null;

  constructor(
    private readonly invoices: InvoiceStore,
    private readonly projects: ProjectStore,
    private readonly quotations: QuotationStore,
    private readonly expenses: ExpenseStore,
    private readonly leads: LeadStore,
    private readonly notifier: InvoiceNotifier,
  ) {}

  async list(query: Required<Pick<InvoiceListQuery, 'page' | 'pageSize'>> & Omit<InvoiceListQuery, 'page' | 'pageSize'>, user: AuthUser) {
    if (!canView(user)) throw forbidden('You do not have access to invoices');
    await this.invoices.syncOverdue();
    const result = await this.invoices.list(query);
    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
    };
  }

  async get(id: string, user: AuthUser) {
    if (!canView(user)) throw forbidden('You do not have access to invoices');
    await this.invoices.syncOverdue();
    const invoice = await this.invoices.findById(id);
    if (!invoice) throw new AppError(404, 'Invoice not found');
    return invoice;
  }

  async createFromProject(input: GenerateInvoiceRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and accountants can generate invoices');

    const project = await this.projects.findById(input.projectId);
    if (!project) throw new AppError(404, 'Project not found');

    const quotation = project.quotationId ? await this.quotations.findById(project.quotationId) : null;
    const approvedExpenses = input.includeApprovedExpenses === false
      ? []
      : (await this.expenses.listExpenses({ projectId: project.id, status: 'approved', page: 1, pageSize: 500 })).expenses;

    const items = [
      ...(quotation?.items.map((item) => ({
        description: item.unit ? `${item.description} (${item.unit})` : item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })) ?? []),
      ...approvedExpenses.map((expense) => ({
        description: `Approved expense: ${expense.description}`,
        quantity: 1,
        unitPrice: expense.amount,
      })),
    ];

    const normalizedItems = items.length > 0
      ? items
      : [
          {
            description: `${project.name} billing`,
            quantity: 1,
            unitPrice: project.budget || 0,
          },
        ];

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const inferredTaxRate = quotation && quotation.subtotal > 0 ? quotation.tax / quotation.subtotal : 0;
    const taxRate = input.taxRate ?? inferredTaxRate;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const invoiceNumber = `INV-${String((await this.invoices.count()) + 1).padStart(5, '0')}`;

    return this.invoices.create({
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      invoiceNumber,
      subtotal,
      tax,
      total,
      dueDate: input.dueDate ?? defaultDueDate(),
      items: normalizedItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  }

  async updateStatus(id: string, status: Extract<InvoiceStatus, 'draft' | 'sent'>, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and accountants can update invoices');
    const invoice = await this.invoices.findById(id);
    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (invoice.status === 'paid') {
      throw new AppError(400, 'Paid invoices cannot be moved back to an earlier state');
    }
    const updated = await this.invoices.setStatus(id, status);
    if (!updated) throw new AppError(404, 'Invoice not found');
    return updated;
  }

  async recordPayment(id: string, input: RecordInvoicePaymentRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and accountants can record invoice payments');
    const invoice = await this.invoices.findById(id);
    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (input.amountPaid > invoice.total) throw new AppError(400, 'Paid amount cannot exceed invoice total');
    const updated = await this.invoices.recordPayment(id, input.amountPaid, input.paidDate ?? new Date().toISOString());
    if (!updated) throw new AppError(404, 'Invoice not found');
    return updated;
  }

  async getDocument(id: string, user: AuthUser) {
    const invoice = await this.get(id, user);
    return renderInvoiceDocument(invoice);
  }

  async getPdf(id: string, user: AuthUser) {
    const invoice = await this.get(id, user);
    const buffer = await renderInvoicePdf(invoice, await this.getLogoDataUrl());
    return {
      filename: `${invoice.invoiceNumber}.pdf`,
      buffer,
    };
  }

  async sendInvoice(id: string, input: SendInvoiceRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and accountants can send invoices');
    const invoice = await this.get(id, user);
    const recipientEmail = input.recipientEmail ?? await this.resolveRecipientEmail(invoice.projectId);
    if (!recipientEmail) {
      throw new AppError(400, 'No client email is available for this invoice');
    }

    const pdf = await renderInvoicePdf(invoice, await this.getLogoDataUrl());
    await this.notifier.sendInvoiceEmail({
      invoice,
      recipientEmail,
      pdf,
      subject: `Invoice ${invoice.invoiceNumber} from SiteCore CRM`,
      intro: input.message?.trim() || `Please find attached invoice ${invoice.invoiceNumber} for ${invoice.clientName}.`,
    });

    const timestamp = new Date().toISOString();
    const updated = await this.invoices.markEmailed(id, timestamp);
    if (!updated) throw new AppError(404, 'Invoice not found');

    return {
      invoice: updated,
      deliveredTo: recipientEmail,
    };
  }

  async sendDueReminders(referenceDate = new Date()) {
    await this.invoices.syncOverdue(referenceDate);
    const candidates = await this.invoices.listReminderCandidates(referenceDate);

    for (const invoice of candidates) {
      const recipientEmail = await this.resolveRecipientEmail(invoice.projectId);
      if (!recipientEmail) continue;

      const pdf = await renderInvoicePdf(invoice, await this.getLogoDataUrl());
      await this.notifier.sendInvoiceEmail({
        invoice,
        recipientEmail,
        pdf,
        subject: `Overdue invoice reminder: ${invoice.invoiceNumber}`,
        intro: `This is a reminder that invoice ${invoice.invoiceNumber} is overdue. Please review the attached invoice and confirm the payment status.`,
      });
      await this.invoices.markReminderSent(invoice.id, referenceDate.toISOString());
    }

    return { reminded: candidates.length };
  }

  private async resolveRecipientEmail(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (!project?.leadId) return null;
    const lead = await this.leads.findById(project.leadId);
    return lead?.contactEmail ?? null;
  }

  private async getLogoDataUrl() {
    this.logoDataUrlPromise ??= loadLogoDataUrl();
    return this.logoDataUrlPromise;
  }
}

async function loadLogoDataUrl() {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const workspaceRoot = resolve(currentDir, '..', '..', '..', '..');
    const file = await readFile(resolve(workspaceRoot, 'LOGO.jpeg'));
    return `data:image/jpeg;base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}
