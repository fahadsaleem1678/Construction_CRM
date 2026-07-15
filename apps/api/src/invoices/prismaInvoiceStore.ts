import type { Prisma, PrismaClient } from '@prisma/client';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@construction-crm/shared-types';
import type { CreateInvoiceInput, InvoiceListStoreQuery, InvoiceStore } from './invoiceStore.js';

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: {
    items: true;
    project: { select: { name: true } };
  };
}>;

function toItem(item: InvoiceRow['items'][number]): InvoiceItem {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    description: item.description,
    quantity: item.quantity.toNumber(),
    unitPrice: item.unitPrice.toNumber(),
    total: item.total.toNumber(),
  };
}

function normalizeStatus(row: InvoiceRow): InvoiceStatus {
  if (row.amountPaid.gte(row.total) && row.total.gt(0)) return 'paid';
  if (row.amountPaid.gt(0)) return 'partially_paid';
  if ((row.status === 'sent' || row.status === 'overdue') && row.dueDate && row.dueDate.getTime() < Date.now()) return 'overdue';
  return row.status as InvoiceStatus;
}

function toInvoice(row: InvoiceRow): Invoice {
  const status = normalizeStatus(row);
  const total = row.total.toNumber();
  const amountPaid = row.amountPaid.toNumber();
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    clientName: row.clientName,
    invoiceNumber: row.invoiceNumber,
    status,
    subtotal: row.subtotal.toNumber(),
    tax: row.tax.toNumber(),
    total,
    amountPaid,
    balanceDue: Math.max(0, total - amountPaid),
    dueDate: row.dueDate?.toISOString() ?? null,
    paidDate: row.paidDate?.toISOString() ?? null,
    lastEmailedAt: row.lastEmailedAt?.toISOString() ?? null,
    lastReminderSentAt: row.lastReminderSentAt?.toISOString() ?? null,
    reminderCount: row.reminderCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(toItem),
  };
}

const include = {
  items: true,
  project: { select: { name: true } },
} as const;

export class PrismaInvoiceStore implements InvoiceStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: InvoiceListStoreQuery) {
    const where: Prisma.InvoiceWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const invoices = rows.map(toInvoice);
    const outstandingTotal = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    return { invoices, total, outstandingTotal };
  }

  async findById(id: string) {
    const row = await this.prisma.invoice.findUnique({ where: { id }, include });
    return row ? toInvoice(row) : null;
  }

  async create(input: CreateInvoiceInput) {
    const row = await this.prisma.invoice.create({
      data: {
        projectId: input.projectId,
        clientName: input.clientName,
        invoiceNumber: input.invoiceNumber,
        subtotal: input.subtotal,
        tax: input.tax,
        total: input.total,
        amountPaid: input.amountPaid ?? 0,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        paidDate: input.paidDate ? new Date(input.paidDate) : null,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include,
    });
    return toInvoice(row);
  }

  async setStatus(id: string, status: InvoiceStatus) {
    try {
      const row = await this.prisma.invoice.update({
        where: { id },
        data: { status },
        include,
      });
      return toInvoice(row);
    } catch {
      return null;
    }
  }

  async recordPayment(id: string, amountPaid: number, paidDate: string | null) {
    try {
      const existing = await this.prisma.invoice.findUnique({ where: { id } });
      if (!existing) return null;
      const total = existing.total.toNumber();
      const nextStatus: InvoiceStatus = amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'sent';
      const row = await this.prisma.invoice.update({
        where: { id },
        data: {
          amountPaid,
          paidDate: amountPaid >= total ? (paidDate ? new Date(paidDate) : new Date()) : null,
          status: nextStatus,
        },
        include,
      });
      return toInvoice(row);
    } catch {
      return null;
    }
  }

  async markEmailed(id: string, sentAt: string) {
    try {
      const row = await this.prisma.invoice.update({
        where: { id },
        data: {
          lastEmailedAt: new Date(sentAt),
          status: 'sent',
        },
        include,
      });
      return toInvoice(row);
    } catch {
      return null;
    }
  }

  async markReminderSent(id: string, sentAt: string) {
    try {
      const row = await this.prisma.invoice.update({
        where: { id },
        data: {
          lastReminderSentAt: new Date(sentAt),
          reminderCount: { increment: 1 },
        },
        include,
      });
      return toInvoice(row);
    } catch {
      return null;
    }
  }

  async listReminderCandidates(referenceDate: Date) {
    const staleBefore = new Date(referenceDate.getTime() - 1000 * 60 * 60 * 24);
    const rows = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: referenceDate },
        status: { in: ['sent', 'partially_paid', 'overdue'] },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lt: staleBefore } },
        ],
      },
      include,
      orderBy: { dueDate: 'asc' },
    });
    return rows.map(toInvoice);
  }

  async count() {
    return this.prisma.invoice.count();
  }

  async syncOverdue(referenceDate = new Date()) {
    await this.prisma.invoice.updateMany({
      where: {
        dueDate: { lt: referenceDate },
        status: { in: ['sent', 'partially_paid'] },
      },
      data: { status: 'overdue' },
    });
  }
}
