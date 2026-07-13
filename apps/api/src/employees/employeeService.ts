import type { UserRole } from '@construction-crm/shared-types';
import type {
  CreateEmployeeInput,
  EmployeeRow,
  EmployeeStore,
  UpdateEmployeeInput
} from './employeeStore.js';
import type { EmployeeListQuery, Employee } from '@construction-crm/shared-types';

/** Roles that can view salary information */
const SALARY_ROLES: UserRole[] = ['owner', 'admin', 'accountant'];

function toPublic(row: EmployeeRow, callerRole: UserRole): Employee {
  const canSeeSalary = SALARY_ROLES.includes(callerRole);
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    cnic: row.cnic,
    phone: row.phone,
    email: row.email,
    jobTitle: row.jobTitle,
    dailyWage: canSeeSalary ? row.dailyWage : null,
    monthlySalary: canSeeSalary ? row.monthlySalary : null,
    status: row.status,
    hireDate: row.hireDate,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class EmployeeService {
  constructor(private readonly store: EmployeeStore) {}

  async listEmployees(query: EmployeeListQuery, callerRole: UserRole) {
    const result = await this.store.listEmployees(query);
    return {
      ...result,
      employees: result.employees.map((e) => toPublic(e, callerRole)),
    };
  }

  async getEmployee(id: string, callerRole: UserRole): Promise<Employee | null> {
    const row = await this.store.getEmployeeById(id);
    if (!row) return null;
    return toPublic(row, callerRole);
  }

  async createEmployee(input: CreateEmployeeInput, callerRole: UserRole): Promise<Employee> {
    const row = await this.store.createEmployee(input);
    return toPublic(row, callerRole);
  }

  async updateEmployee(
    id: string,
    input: UpdateEmployeeInput,
    callerRole: UserRole
  ): Promise<Employee | null> {
    const row = await this.store.updateEmployee(id, input);
    if (!row) return null;
    return toPublic(row, callerRole);
  }

  async deactivateEmployee(id: string): Promise<Employee | null> {
    const row = await this.store.updateEmployee(id, { status: 'inactive' });
    if (!row) return null;
    return toPublic(row, 'owner'); // deactivation only done by owner/admin
  }

  async deleteEmployee(id: string): Promise<void> {
    return this.store.deleteEmployee(id);
  }
}
