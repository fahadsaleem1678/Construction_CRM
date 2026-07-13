import type { Employee, EmployeeListQuery, EmploymentStatus } from '@construction-crm/shared-types';

export type EmployeeRow = {
  id: string;
  userId: string | null;
  name: string;
  cnic: string | null;
  phone: string | null;
  email: string | null;
  jobTitle: string;
  dailyWage: number | null;
  monthlySalary: number | null;
  status: EmploymentStatus;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeInput = {
  name: string;
  jobTitle: string;
  userId?: string | null;
  cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  hireDate?: string | null;
  notes?: string | null;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?: EmploymentStatus;
};

export type EmployeeListResult = {
  employees: EmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export interface EmployeeStore {
  listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult>;
  getEmployeeById(id: string): Promise<EmployeeRow | null>;
  createEmployee(input: CreateEmployeeInput): Promise<EmployeeRow>;
  updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeRow | null>;
  deleteEmployee(id: string): Promise<void>;
}
