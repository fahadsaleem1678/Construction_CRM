import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import type { ExpenseService } from '../expenses/expenseService.js';
import type {
  CreateExpenseRequest,
  ExpenseListQuery,
  ExpenseCategory,
  ExpenseStatus
} from '@construction-crm/shared-types';

export function expenseRoutes(expenseService: ExpenseService, store: UserStore) {
  const router = Router();
  router.use(authenticate(store));

  // List expenses — all authenticated users
  router.get('/', async (req, res, next) => {
    try {
      const query: ExpenseListQuery = {
        projectId: req.query['projectId'] as string | undefined,
        status: req.query['status'] as ExpenseStatus | undefined,
        category: req.query['category'] as ExpenseCategory | undefined,
        page: req.query['page'] ? Number(req.query['page']) : undefined,
        pageSize: req.query['pageSize'] ? Number(req.query['pageSize']) : undefined,
      };
      const result = await expenseService.listExpenses(query, req.user!.role);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get single expense
  router.get('/:id', async (req, res, next) => {
    try {
      const expense = await expenseService.getExpense(req.params['id'] as string);
      if (!expense) return res.status(404).json({ message: 'Expense not found' });
      res.json({ expense });
    } catch (err) {
      next(err);
    }
  });

  // Submit new expense — all authenticated users
  router.post('/', async (req, res, next) => {
    try {
      const input = req.body as CreateExpenseRequest;
      if (!input.category) return res.status(400).json({ message: 'Category is required' });
      if (!input.description?.trim()) return res.status(400).json({ message: 'Description is required' });
      if (!input.amount || Number(input.amount) <= 0) return res.status(400).json({ message: 'Amount must be > 0' });
      if (!input.expenseDate) return res.status(400).json({ message: 'Expense date is required' });

      const expense = await expenseService.createExpense({
        category: input.category,
        description: input.description.trim(),
        amount: Number(input.amount),
        expenseDate: input.expenseDate,
        projectId: input.projectId ?? null,
        employeeId: input.employeeId ?? null,
        submittedBy: req.user!.id,
        receiptNote: input.receiptNote?.trim() || null,
      });
      res.status(201).json({ expense });
    } catch (err) {
      next(err);
    }
  });

  // Approve expense — owner/admin/accountant
  router.patch(
    '/:id/approve',
    authorize(['owner', 'admin', 'accountant']),
    async (req, res, next) => {
      try {
        const { expense, error } = await expenseService.approveExpense(
          req.params['id'] as string,
          req.user!.id,
          req.user!.role
        );
        if (error) return res.status(400).json({ message: error });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ expense });
      } catch (err) {
        next(err);
      }
    }
  );

  // Reject expense — owner/admin/accountant/manager
  router.patch(
    '/:id/reject',
    authorize(['owner', 'admin', 'accountant', 'manager']),
    async (req, res, next) => {
      try {
        const rejectionNote = (req.body as { rejectionNote?: string }).rejectionNote ?? '';
        const { expense, error } = await expenseService.rejectExpense(
          req.params['id'] as string,
          rejectionNote,
          req.user!.role
        );
        if (error) return res.status(400).json({ message: error });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ expense });
      } catch (err) {
        next(err);
      }
    }
  );

  // Delete expense — owner/admin only
  router.delete(
    '/:id',
    authorize(['owner', 'admin']),
    async (req, res, next) => {
      try {
        const { ok, error } = await expenseService.deleteExpense(req.params['id'] as string, req.user!.role);
        if (!ok) return res.status(403).json({ message: error });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
