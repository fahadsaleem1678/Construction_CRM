import type { PrismaClient } from '@prisma/client';
import type { EmployeeListQuery } from '@construction-crm/shared-types';
import type {
  CreateEmployeeInput,
  EmployeeRow,
  EmployeeStore,
  EmployeeListResult,
  UpdateEmployeeInput
} from './employeeStore.js';

function toRow(e: {
  id: string;
  userId: string | null;
  name: string;
  cnic: string | null;
  phone: string | null;
  email: string | null;
  jobTitle: string;
  dailyWage: { toNumber(): number } | null;
  monthlySalary: { toNumber(): number } | null;
  status: string;
  hireDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EmployeeRow {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    cnic: e.cnic,
    phone: e.phone,
    email: e.email,
    jobTitle: e.jobTitle,
    dailyWage: e.dailyWage ? e.dailyWage.toNumber() : null,
    monthlySalary: e.monthlySalary ? e.monthlySalary.toNumber() : null,
    status: e.status as EmployeeRow['status'],
    hireDate: e.hireDate ? e.hireDate.toISOString() : null,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export class PrismaEmployeeStore implements EmployeeStore {
  constructor(private readonly prisma: PrismaClient) {}

  async listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      employees: rows.map(toRow),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getEmployeeById(id: string): Promise<EmployeeRow | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    return row ? toRow(row) : null;
  }

  async createEmployee(input: CreateEmployeeInput): Promise<EmployeeRow> {
    const row = await this.prisma.employee.create({
      data: {
        name: input.name,
        jobTitle: input.jobTitle,
        userId: input.userId ?? null,
        cnic: input.cnic ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        dailyWage: input.dailyWage ?? null,
        monthlySalary: input.monthlySalary ?? null,
        hireDate: input.hireDate ? new Date(input.hireDate) : null,
        notes: input.notes ?? null,
      },
    });
    return toRow(row);
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeRow | null> {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) return null;

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.userId !== undefined ? { userId: input.userId } : {}),
        ...(input.cnic !== undefined ? { cnic: input.cnic } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.dailyWage !== undefined ? { dailyWage: input.dailyWage } : {}),
        ...(input.monthlySalary !== undefined ? { monthlySalary: input.monthlySalary } : {}),
        ...(input.hireDate !== undefined ? { hireDate: input.hireDate ? new Date(input.hireDate) : null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toRow(row);
  }

  async deleteEmployee(id: string): Promise<void> {
    // Soft delete: mark as terminated
    await this.prisma.employee.update({ where: { id }, data: { status: 'terminated' } });
  }
}
