import type { PrismaClient } from '@prisma/client';
import type {
  CreateExpenseInput,
  ExpenseRow,
  ExpenseStore,
  ExpenseListResult,
  ExpenseStoreListQuery,
} from './expenseStore.js';

type PrismaExpenseWithRelations = {
  id: string;
  projectId: string | null;
  employeeId: string | null;
  submittedBy: string | null;
  approvedBy: string | null;
  category: string;
  description: string;
  amount: { toNumber(): number };
  expenseDate: Date;
  status: string;
  receiptNote: string | null;
  rejectionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string } | null;
  employee: { name: string } | null;
  submitter: { name: string } | null;
  approver: { name: string } | null;
};

function toRow(e: PrismaExpenseWithRelations): ExpenseRow {
  return {
    id: e.id,
    projectId: e.projectId,
    projectName: e.project?.name ?? null,
    employeeId: e.employeeId,
    employeeName: e.employee?.name ?? null,
    submittedBy: e.submittedBy,
    submitterName: e.submitter?.name ?? null,
    approvedBy: e.approvedBy,
    approverName: e.approver?.name ?? null,
    category: e.category as ExpenseRow['category'],
    description: e.description,
    amount: e.amount.toNumber(),
    expenseDate: e.expenseDate.toISOString(),
    status: e.status as ExpenseRow['status'],
    receiptNote: e.receiptNote,
    rejectionNote: e.rejectionNote,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

const includeRelations = {
  project: { select: { name: true } },
  employee: { select: { name: true } },
  submitter: { select: { name: true } },
  approver: { select: { name: true } },
};

export class PrismaExpenseStore implements ExpenseStore {
  constructor(private readonly prisma: PrismaClient) {}

  async listExpenses(query: ExpenseStoreListQuery): Promise<ExpenseListResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.submittedBy ? { submittedBy: query.submittedBy } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    const [rows, total, aggResult] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { expenseDate: 'desc' },
        include: includeRelations,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    const totalAmount = aggResult._sum.amount ? aggResult._sum.amount.toNumber() : 0;

    return {
      expenses: rows.map(toRow),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalAmount,
    };
  }

  async getExpenseById(id: string): Promise<ExpenseRow | null> {
    const row = await this.prisma.expense.findUnique({
      where: { id },
      include: includeRelations,
    });
    return row ? toRow(row) : null;
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
    const row = await this.prisma.expense.create({
      data: {
        category: input.category,
        description: input.description,
        amount: input.amount,
        expenseDate: new Date(input.expenseDate),
        projectId: input.projectId ?? null,
        employeeId: input.employeeId ?? null,
        submittedBy: input.submittedBy ?? null,
        receiptNote: input.receiptNote ?? null,
      },
      include: includeRelations,
    });
    return toRow(row);
  }

  async approveExpense(id: string, approverId: string): Promise<ExpenseRow | null> {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.expense.update({
      where: { id },
      data: { status: 'approved', approvedBy: approverId, rejectionNote: null },
      include: includeRelations,
    });
    return toRow(row);
  }

  async rejectExpense(id: string, rejectionNote: string): Promise<ExpenseRow | null> {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.expense.update({
      where: { id },
      data: { status: 'rejected', rejectionNote },
      include: includeRelations,
    });
    return toRow(row);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.prisma.expense.delete({ where: { id } });
  }
}
