import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryExpenseStore } from '../expenses/inMemoryExpenseStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { InMemoryInvoiceStore } from '../invoices/inMemoryInvoiceStore.js';
import { InMemoryProjectStore } from '../projects/inMemoryProjectStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { MockInvoiceNotifier } from './helpers/mockInvoiceNotifier.js';

async function setup() {
  const userStore = new InMemoryUserStore();
  const leadStore = new InMemoryLeadStore();
  const quotationStore = new InMemoryQuotationStore();
  const projectStore = new InMemoryProjectStore();
  const expenseStore = new InMemoryExpenseStore();
  const invoiceStore = new InMemoryInvoiceStore();
  const app = createApp(userStore, leadStore, quotationStore, projectStore, expenseStore, invoiceStore, new MockInvoiceNotifier());

  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@sitecore.test',
    name: 'Owner',
    password: 'Password123!',
  });

  return { app, ownerToken: owner.body.accessToken as string };
}

describe('phase 9 analytics', () => {
  it('returns a global dashboard snapshot for owners', async () => {
    const { app, ownerToken } = await setup();

    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Analytics Client',
        contactPhone: '+15550001111',
        contactEmail: 'analytics@example.com',
        source: 'referral',
        estimatedValue: 120000,
      });

    const quotation = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        leadId: lead.body.lead.id,
        taxRate: 0.1,
        items: [{ description: 'Civil work', unit: 'job', quantity: 1, unitPrice: 100000 }],
      });

    await request(app)
      .post(`/api/quotations/${quotation.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'accepted' });

    const project = await request(app)
      .post('/api/projects/from-quotation')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quotationId: quotation.body.quotation.id });

    await request(app)
      .post(`/api/projects/${project.body.project.id}/milestones`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Foundation pour',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
      });

    const expense = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        category: 'materials',
        description: 'Steel rods',
        amount: 8000,
        expenseDate: '2026-07-15',
        projectId: project.body.project.id,
      });

    await request(app)
      .patch(`/api/expenses/${expense.body.expense.id}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const invoice = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        projectId: project.body.project.id,
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        includeApprovedExpenses: true,
      });

    await request(app)
      .patch(`/api/invoices/${invoice.body.invoice.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'sent' });

    const dashboard = await request(app)
      .get('/api/analytics/dashboard?months=6')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.access.assignedOnly).toBe(false);
    expect(dashboard.body.summary.activeProjectCount).toBe(1);
    expect(dashboard.body.summary.overdueInvoiceCount).toBe(1);
    expect(dashboard.body.expenseBuckets.find((bucket: { category: string }) => bucket.category === 'materials')?.total).toBe(8000);
    expect(dashboard.body.upcomingMilestones).toHaveLength(1);
  });

  it('limits employees to assigned-scope analytics', async () => {
    const { app, ownerToken } = await setup();

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'worker@sitecore.test',
        name: 'Assigned Worker',
        role: 'employee',
      });

    const employee = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Password123!',
    });

    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Assigned Lead',
        contactPhone: '+15550002222',
        source: 'walk_in',
        assignedTo: employee.body.user.id,
      });

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Assigned Project',
        clientName: 'Assigned Client',
      });

    await request(app)
      .post(`/api/projects/${project.body.project.id}/assignments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: employee.body.user.id,
        roleOnProject: 'Foreman',
      });

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${employee.body.accessToken}`)
      .send({
        category: 'transport',
        description: 'Fuel run',
        amount: 250,
        expenseDate: '2026-07-15',
        projectId: project.body.project.id,
      });

    const dashboard = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${employee.body.accessToken}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.scope).toBe('assigned');
    expect(dashboard.body.access.invoices).toBe(false);
    expect(dashboard.body.summary.activeLeadCount).toBe(1);
    expect(dashboard.body.summary.activeProjectCount).toBe(1);
    expect(dashboard.body.summary.pendingExpenseCount).toBe(1);
    expect(dashboard.body.leadBuckets.find((bucket: { status: string }) => bucket.status === 'new')?.count).toBe(1);
    expect(dashboard.body.revenueSeries).toHaveLength(0);

    void lead;
  });
});
