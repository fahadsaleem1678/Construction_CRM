import type { AuthUser, UserRole, Expense, ExpenseListQuery } from '@construction-crm/shared-types';
import type { CreateExpenseInput, ExpenseRow, ExpenseStore, ExpenseListResult } from './expenseStore.js';

/** Roles that can approve / reject expenses */
const APPROVER_ROLES: UserRole[] = ['owner', 'admin', 'accountant'];

function toPublic(row: ExpenseRow): Expense {
  return { ...row };
}

export class ExpenseService {
  constructor(private readonly store: ExpenseStore) {}

  async listExpenses(query: ExpenseListQuery, user: AuthUser) {
    const result = await this.store.listExpenses({
      ...query,
      submittedBy: user.role === 'employee' ? user.id : undefined,
    });
    return {
      ...result,
      expenses: result.expenses.map(toPublic),
    };
  }

  async getExpense(id: string, user: AuthUser): Promise<Expense | null> {
    const row = await this.store.getExpenseById(id);
    if (row && user.role === 'employee' && row.submittedBy !== user.id) return null;
    return row ? toPublic(row) : null;
  }

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const row = await this.store.createExpense(input);
    return toPublic(row);
  }

  async approveExpense(
    id: string,
    approverId: string,
    callerRole: UserRole
  ): Promise<{ expense: Expense | null; error?: string }> {
    if (!APPROVER_ROLES.includes(callerRole)) {
      return { expense: null, error: 'Insufficient permissions to approve expenses' };
    }
    const expense = await this.store.getExpenseById(id);
    if (!expense) return { expense: null, error: 'Expense not found' };
    if (expense.status !== 'pending') {
      return { expense: null, error: `Cannot approve an expense with status "${expense.status}"` };
    }
    const updated = await this.store.approveExpense(id, approverId);
    return { expense: updated ? toPublic(updated) : null };
  }

  async rejectExpense(
    id: string,
    rejectionNote: string,
    callerRole: UserRole
  ): Promise<{ expense: Expense | null; error?: string }> {
    if (!APPROVER_ROLES.includes(callerRole) && callerRole !== 'manager') {
      return { expense: null, error: 'Insufficient permissions to reject expenses' };
    }
    if (!rejectionNote?.trim()) {
      return { expense: null, error: 'A rejection note is required' };
    }
    const expense = await this.store.getExpenseById(id);
    if (!expense) return { expense: null, error: 'Expense not found' };
    if (expense.status !== 'pending') {
      return { expense: null, error: `Cannot reject an expense with status "${expense.status}"` };
    }
    const updated = await this.store.rejectExpense(id, rejectionNote.trim());
    return { expense: updated ? toPublic(updated) : null };
  }

  async deleteExpense(
    id: string,
    callerRole: UserRole
  ): Promise<{ ok: boolean; error?: string }> {
    if (!['owner', 'admin'].includes(callerRole)) {
      return { ok: false, error: 'Only owner or admin can delete expenses' };
    }
    await this.store.deleteExpense(id);
    return { ok: true };
  }
}
