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
    email: 'owner-search@sitecore.test',
    name: 'Search Owner',
    password: 'Password123!',
  });

  return { app, ownerToken: owner.body.accessToken as string };
}

describe('phase 10 global search', () => {
  it('searches leads, projects, and invoices for owners', async () => {
    const { app, ownerToken } = await setup();

    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Alpha Homes',
        contactPhone: '+15550003333',
        contactEmail: 'alpha@example.com',
        source: 'referral',
        estimatedValue: 90000,
      });

    const quotation = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        leadId: lead.body.lead.id,
        taxRate: 0,
        items: [{ description: 'Alpha shell works', unit: 'job', quantity: 1, unitPrice: 90000 }],
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
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ projectId: project.body.project.id });

    const response = await request(app)
      .get('/api/search?q=alpha')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.query).toBe('alpha');
    expect(response.body.results.map((result: { type: string }) => result.type)).toEqual(
      expect.arrayContaining(['lead', 'project', 'invoice']),
    );
  });

  it('limits employee search to assigned leads and projects', async () => {
    const { app, ownerToken } = await setup();

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'search-worker@sitecore.test',
        name: 'Search Worker',
        role: 'employee',
      });

    const employee = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Password123!',
    });

    await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Assigned Ridge',
        contactPhone: '+15550004444',
        source: 'walk_in',
        assignedTo: employee.body.user.id,
      });

    await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Hidden Ridge',
        contactPhone: '+15550005555',
        source: 'phone',
      });

    const assignedProject = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Assigned Ridge Build',
        clientName: 'Assigned Ridge',
      });

    await request(app)
      .post(`/api/projects/${assignedProject.body.project.id}/assignments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: employee.body.user.id,
        roleOnProject: 'Foreman',
      });

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Hidden Ridge Build',
        clientName: 'Hidden Ridge',
      });

    const response = await request(app)
      .get('/api/search?q=ridge')
      .set('Authorization', `Bearer ${employee.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.results.map((result: { title: string }) => result.title)).toEqual(
      expect.arrayContaining(['Assigned Ridge', 'Assigned Ridge Build']),
    );
    expect(response.body.results.some((result: { title: string }) => result.title.includes('Hidden'))).toBe(false);
    expect(response.body.results.some((result: { type: string }) => result.type === 'invoice')).toBe(false);
  });
});
