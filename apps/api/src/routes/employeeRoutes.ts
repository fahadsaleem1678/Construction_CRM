import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import type { EmployeeService } from '../employees/employeeService.js';
import type { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeListQuery, EmploymentStatus } from '@construction-crm/shared-types';

export function employeeRoutes(employeeService: EmployeeService, store: UserStore) {
  const router = Router();
  router.use(authenticate(store));

  // List employees — owner/admin/manager/accountant
  router.get(
    '/',
    authorize(['owner', 'admin', 'manager', 'accountant']),
    async (req, res, next) => {
      try {
        const query: EmployeeListQuery = {
          status: req.query['status'] as EmploymentStatus | undefined,
          page: req.query['page'] ? Number(req.query['page']) : undefined,
          pageSize: req.query['pageSize'] ? Number(req.query['pageSize']) : undefined,
        };
        const result = await employeeService.listEmployees(query, req.user!.role);
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // Get single employee
  router.get(
    '/:id',
    authorize(['owner', 'admin', 'manager', 'accountant']),
    async (req, res, next) => {
      try {
        const employee = await employeeService.getEmployee(req.params['id'] as string, req.user!.role);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json({ employee });
      } catch (err) {
        next(err);
      }
    }
  );

  // Create employee — owner/admin only
  router.post(
    '/',
    authorize(['owner', 'admin']),
    async (req, res, next) => {
      try {
        const input = req.body as CreateEmployeeRequest;
        if (!input.name?.trim()) return res.status(400).json({ message: 'Name is required' });
        if (!input.jobTitle?.trim()) return res.status(400).json({ message: 'Job title is required' });
        const employee = await employeeService.createEmployee(
          {
            name: input.name.trim(),
            jobTitle: input.jobTitle.trim(),
            userId: input.userId ?? null,
            cnic: input.cnic?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            dailyWage: input.dailyWage ?? null,
            monthlySalary: input.monthlySalary ?? null,
            hireDate: input.hireDate ?? null,
            notes: input.notes?.trim() || null,
          },
          req.user!.role
        );
        res.status(201).json({ employee });
      } catch (err) {
        next(err);
      }
    }
  );

  // Update employee — owner/admin only
  router.patch(
    '/:id',
    authorize(['owner', 'admin']),
    async (req, res, next) => {
      try {
        const input = req.body as UpdateEmployeeRequest;
        const employee = await employeeService.updateEmployee(req.params['id'] as string, input, req.user!.role);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json({ employee });
      } catch (err) {
        next(err);
      }
    }
  );

  // Deactivate / delete employee — owner/admin only
  router.delete(
    '/:id',
    authorize(['owner', 'admin']),
    async (req, res, next) => {
      try {
        await employeeService.deleteEmployee(req.params['id'] as string);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
