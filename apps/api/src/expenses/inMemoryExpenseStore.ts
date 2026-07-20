import crypto from 'node:crypto';
import type { Expense, ExpenseStatus } from '@construction-crm/shared-types';
import type { CreateExpenseInput, ExpenseListResult, ExpenseRow, ExpenseStore, ExpenseStoreListQuery } from './expenseStore.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function toRow(expense: Expense): ExpenseRow {
  return { ...expense };
}

export class InMemoryExpenseStore implements ExpenseStore {
  private readonly expenses = new Map<string, Expense>();

  async listExpenses(query: ExpenseStoreListQuery): Promise<ExpenseListResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, query.pageSize ?? 20);
    const start = (page - 1) * pageSize;

    let expenses = [...this.expenses.values()];
    if (query.projectId) expenses = expenses.filter((expense) => expense.projectId === query.projectId);
    if (query.submittedBy) expenses = expenses.filter((expense) => expense.submittedBy === query.submittedBy);
    if (query.status) expenses = expenses.filter((expense) => expense.status === query.status);
    if (query.category) expenses = expenses.filter((expense) => expense.category === query.category);
    expenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

    const total = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      expenses: expenses.slice(start, start + pageSize).map(toRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totalAmount,
    };
  }

  async getExpenseById(id: string): Promise<ExpenseRow | null> {
    const expense = this.expenses.get(id);
    return expense ? toRow(expense) : null;
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
    const expense: Expense = {
      id: id(),
      projectId: input.projectId ?? null,
      projectName: null,
      employeeId: input.employeeId ?? null,
      employeeName: null,
      submittedBy: input.submittedBy ?? null,
      submitterName: null,
      approvedBy: null,
      approverName: null,
      category: input.category,
      description: input.description,
      amount: input.amount,
      expenseDate: new Date(input.expenseDate).toISOString(),
      status: 'pending',
      receiptNote: input.receiptNote ?? null,
      rejectionNote: null,
      createdAt: now(),
      updatedAt: now(),
    };

    this.expenses.set(expense.id, expense);
    return toRow(expense);
  }

  async approveExpense(id: string, approverId: string): Promise<ExpenseRow | null> {
    return this.updateStatus(id, 'approved', { approvedBy: approverId, rejectionNote: null });
  }

  async rejectExpense(id: string, rejectionNote: string): Promise<ExpenseRow | null> {
    return this.updateStatus(id, 'rejected', { rejectionNote });
  }

  async deleteExpense(id: string): Promise<void> {
    this.expenses.delete(id);
  }

  private async updateStatus(id: string, status: ExpenseStatus, extra: Partial<Expense>): Promise<ExpenseRow | null> {
    const existing = this.expenses.get(id);
    if (!existing) return null;
    const next: Expense = {
      ...existing,
      status,
      ...extra,
      updatedAt: now(),
    };
    this.expenses.set(id, next);
    return toRow(next);
  }
}
