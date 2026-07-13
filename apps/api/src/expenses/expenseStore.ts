import type { ExpenseCategory, ExpenseStatus, ExpenseListQuery } from '@construction-crm/shared-types';

export type ExpenseRow = {
  id: string;
  projectId: string | null;
  projectName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  submittedBy: string | null;
  submitterName: string | null;
  approvedBy: string | null;
  approverName: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  status: ExpenseStatus;
  receiptNote: string | null;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseInput = {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  projectId?: string | null;
  employeeId?: string | null;
  submittedBy?: string | null;
  receiptNote?: string | null;
};

export type ExpenseListResult = {
  expenses: ExpenseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalAmount: number;
};

export interface ExpenseStore {
  listExpenses(query: ExpenseListQuery): Promise<ExpenseListResult>;
  getExpenseById(id: string): Promise<ExpenseRow | null>;
  createExpense(input: CreateExpenseInput): Promise<ExpenseRow>;
  approveExpense(id: string, approverId: string): Promise<ExpenseRow | null>;
  rejectExpense(id: string, rejectionNote: string): Promise<ExpenseRow | null>;
  deleteExpense(id: string): Promise<void>;
}
