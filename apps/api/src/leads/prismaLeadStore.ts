import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateLeadRequest, Lead, LeadActivity, UpdateLeadRequest } from '@construction-crm/shared-types';
import type { LeadListStoreQuery, LeadStore } from './leadStore.js';

function toLead(row: {
  id: string;
  clientName: string;
  contactPhone: string;
  contactEmail: string | null;
  source: string;
  status: string;
  estimatedValue: Prisma.Decimal;
  assignedTo: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: { name: string } | null;
}): Lead {
  return {
    id: row.id,
    clientName: row.clientName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    source: row.source as Lead['source'],
    status: row.status as Lead['status'],
    estimatedValue: Number(row.estimatedValue),
    assignedTo: row.assignedTo,
    assignedUserName: row.assignee?.name ?? null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class PrismaLeadStore implements LeadStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: LeadListStoreQuery) {
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.visibleAssignedTo ? { assignedTo: query.visibleAssignedTo } : {})
    };

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: { assignee: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prisma.lead.count({ where })
    ]);

    return { leads: rows.map(toLead), total };
  }

  async findById(id: string) {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      include: { assignee: { select: { name: true } } }
    });
    return row ? toLead(row) : null;
  }

  async create(input: CreateLeadRequest) {
    const row = await this.prisma.lead.create({
      data: {
        clientName: input.clientName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        source: input.source,
        status: input.status ?? 'new',
        estimatedValue: input.estimatedValue ?? 0,
        assignedTo: input.assignedTo ?? null,
        notes: input.notes ?? null
      },
      include: { assignee: { select: { name: true } } }
    });
    return toLead(row);
  }

  async update(id: string, input: UpdateLeadRequest) {
    try {
      const row = await this.prisma.lead.update({
        where: { id },
        data: {
          ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.estimatedValue !== undefined ? { estimatedValue: input.estimatedValue } : {}),
          ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {})
        },
        include: { assignee: { select: { name: true } } }
      });
      return toLead(row);
    } catch {
      return null;
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.lead.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async activities(leadId: string) {
    const rows = await this.prisma.activityLog.findMany({
      where: { entityType: 'lead', entityId: leadId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(
      (row): LeadActivity => ({
        id: row.id,
        userName: row.user?.name ?? null,
        action: row.action,
        entityType: 'lead',
        entityId: row.entityId,
        metadata: row.metadataJson as Record<string, unknown>,
        createdAt: row.createdAt.toISOString()
      }),
    );
  }

  async addActivity(input: { userId: string | null; action: string; entityId: string; metadata: Record<string, unknown> }) {
    await this.prisma.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: 'lead',
        entityId: input.entityId,
        metadataJson: input.metadata as Prisma.InputJsonObject
      }
    });
  }
}
