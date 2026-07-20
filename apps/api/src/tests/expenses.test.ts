import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { prisma } from '../db/prisma.js';
import { PrismaEmployeeStore } from '../employees/prismaEmployeeStore.js';
import { InMemoryExpenseStore } from '../expenses/inMemoryExpenseStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { InMemoryInvoiceStore } from '../invoices/inMemoryInvoiceStore.js';
import { InMemoryProjectStore } from '../projects/inMemoryProjectStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';
import { MockInvoiceNotifier } from './helpers/mockInvoiceNotifier.js';

async function setup() {
  const users = new InMemoryUserStore();
  const app = createApp(
    users,
    new InMemoryLeadStore(),
    new InMemoryQuotationStore(),
    new InMemoryProjectStore(),
    new InMemoryExpenseStore(),
    new InMemoryInvoiceStore(),
    new MockInvoiceNotifier(),
    new PrismaEmployeeStore(prisma),
  );

  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!',
  });

  async function createEmployee(email: string, name: string) {
    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ email, name, role: 'employee' });

    const accepted = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Password123!',
    });

    return {
      token: accepted.body.accessToken as string,
      userId: accepted.body.user.id as string,
    };
  }

  return {
    app,
    ownerToken: owner.body.accessToken as string,
    employeeOne: await createEmployee('employee1@buildco.test', 'Employee One'),
    employeeTwo: await createEmployee('employee2@buildco.test', 'Employee Two'),
  };
}

describe('phase 6 expenses', () => {
  it('limits employees to expenses they submitted', async () => {
    const { app, ownerToken, employeeOne, employeeTwo } = await setup();

    const first = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${employeeOne.token}`)
      .send({
        category: 'transport',
        description: 'Fuel receipt',
        amount: 4500,
        expenseDate: '2026-07-20',
      });

    const second = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${employeeTwo.token}`)
      .send({
        category: 'materials',
        description: 'Site supplies',
        amount: 12000,
        expenseDate: '2026-07-20',
      });

    const employeeList = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${employeeOne.token}`);
    expect(employeeList.status).toBe(200);
    expect(employeeList.body.total).toBe(1);
    expect(employeeList.body.totalAmount).toBe(4500);
    expect(employeeList.body.expenses[0].id).toBe(first.body.expense.id);
    expect(employeeList.body.expenses[0].submittedBy).toBe(employeeOne.userId);

    const blockedDetail = await request(app)
      .get(`/api/expenses/${second.body.expense.id}`)
      .set('Authorization', `Bearer ${employeeOne.token}`);
    expect(blockedDetail.status).toBe(404);

    const ownerList = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.total).toBe(2);
  });
});
