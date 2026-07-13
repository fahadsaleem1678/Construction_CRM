import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateQuotationRequest,
  Quotation,
  QuotationStatus,
  UpdateQuotationRequest
} from '@construction-crm/shared-types';
import type { QuotationStore } from './quotationStore.js';

function toQuotation(row: Prisma.QuotationGetPayload<{ include: { items: true; lead: true; creator: true } }>): Quotation {
  return {
    id: row.id,
    leadId: row.leadId,
    leadClientName: row.lead.clientName,
    quotationNumber: row.quotationNumber,
    status: row.status as QuotationStatus,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    validUntil: row.validUntil?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdByName: row.creator?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      quotationId: item.quotationId,
      description: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total)
    }))
  };
}

function calculate(items: CreateQuotationRequest['items'], taxRate = 0.16) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}

const include = { items: true, lead: true, creator: true } as const;

export class PrismaQuotationStore implements QuotationStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    const [rows, total] = await Promise.all([
      this.prisma.quotation.findMany({ include, orderBy: { createdAt: 'desc' } }),
      this.prisma.quotation.count()
    ]);
    return { quotations: rows.map(toQuotation), total };
  }

  async findById(id: string) {
    const row = await this.prisma.quotation.findUnique({ where: { id }, include });
    return row ? toQuotation(row) : null;
  }

  count() {
    return this.prisma.quotation.count();
  }

  async create(input: CreateQuotationRequest & { quotationNumber: string; createdBy: string | null }) {
    const totals = calculate(input.items, input.taxRate);
    const row = await this.prisma.quotation.create({
      data: {
        leadId: input.leadId,
        quotationNumber: input.quotationNumber,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        createdBy: input.createdBy,
        ...totals,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        }
      },
      include
    });
    return toQuotation(row);
  }

  async update(id: string, input: UpdateQuotationRequest) {
    const totals = input.items ? calculate(input.items, input.taxRate) : undefined;
    const row = await this.prisma.quotation.update({
      where: { id },
      data: {
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil ? new Date(input.validUntil) : null } : {}),
        ...(totals ?? {}),
        ...(input.items
          ? {
              items: {
                deleteMany: {},
                create: input.items.map((item) => ({
                  description: item.description,
                  unit: item.unit,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.quantity * item.unitPrice
                }))
              }
            }
          : {})
      },
      include
    });
    return toQuotation(row);
  }

  async setStatus(id: string, status: QuotationStatus) {
    const row = await this.prisma.quotation.update({ where: { id }, data: { status }, include });
    return toQuotation(row);
  }

  async delete(id: string) {
    try {
      await this.prisma.quotation.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
