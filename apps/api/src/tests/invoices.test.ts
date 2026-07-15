import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { InMemoryExpenseStore } from '../expenses/inMemoryExpenseStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { InMemoryInvoiceStore } from '../invoices/inMemoryInvoiceStore.js';
import { InMemoryProjectStore } from '../projects/inMemoryProjectStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';
import { MockInvoiceNotifier } from './helpers/mockInvoiceNotifier.js';

async function setup() {
  const userStore = new InMemoryUserStore();
  const leadStore = new InMemoryLeadStore();
  const quotationStore = new InMemoryQuotationStore();
  const projectStore = new InMemoryProjectStore();
  const expenseStore = new InMemoryExpenseStore();
  const invoiceStore = new InMemoryInvoiceStore();
  const notifier = new MockInvoiceNotifier();
  const app = createApp(userStore, leadStore, quotationStore, projectStore, expenseStore, invoiceStore, notifier);

  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!',
  });

  return { app, token: owner.body.accessToken as string, notifier, invoiceStore };
}

describe('phase 7 invoices', () => {
  it('generates invoices from project quotations and approved expenses', async () => {
    const { app, token, notifier, invoiceStore } = await setup();

    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientName: 'Invoice Client',
        contactPhone: '+15550000001',
        source: 'referral',
      });

    const quotation = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        leadId: lead.body.lead.id,
        taxRate: 0.1,
        items: [{ description: 'Masonry work', unit: 'job', quantity: 1, unitPrice: 100000 }],
      });

    await request(app)
      .post(`/api/quotations/${quotation.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });

    const project = await request(app)
      .post('/api/projects/from-quotation')
      .set('Authorization', `Bearer ${token}`)
      .send({ quotationId: quotation.body.quotation.id });

    const expense = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'materials',
        description: 'Cement bags',
        amount: 25000,
        expenseDate: '2026-07-13',
        projectId: project.body.project.id,
      });

    await request(app)
      .patch(`/api/expenses/${expense.body.expense.id}/approve`)
      .set('Authorization', `Bearer ${token}`);

    const created = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId: project.body.project.id,
        includeApprovedExpenses: true,
      });

    expect(created.status).toBe(201);
    expect(created.body.invoice.invoiceNumber).toBe('INV-00001');
    expect(created.body.invoice.items).toHaveLength(2);
    expect(created.body.invoice.subtotal).toBe(125000);
    expect(created.body.invoice.tax).toBe(12500);
    expect(created.body.invoice.total).toBe(137500);

    const sent = await request(app)
      .patch(`/api/invoices/${created.body.invoice.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sent' });
    expect(sent.body.invoice.status).toBe('sent');

    const payment = await request(app)
      .patch(`/api/invoices/${created.body.invoice.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amountPaid: 50000, paidDate: '2026-07-13' });
    expect(payment.body.invoice.status).toBe('partially_paid');
    expect(payment.body.invoice.balanceDue).toBe(87500);

    const pdf = await request(app)
      .get(`/api/invoices/${created.body.invoice.id}/pdf`)
      .set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');

    const sentMail = await request(app)
      .post(`/api/invoices/${created.body.invoice.id}/send`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientEmail: 'client@example.com' });
    expect(sentMail.status).toBe(200);
    expect(sentMail.body.deliveredTo).toBe('client@example.com');
    expect(notifier.sent).toHaveLength(1);

    const reminded = await invoiceStore.markReminderSent(created.body.invoice.id, '2026-07-15T00:00:00.000Z');
    expect(reminded?.reminderCount).toBe(1);
  });

  it('blocks managers from generating invoices but allows them to view', async () => {
    const { app, token } = await setup();

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'manager@buildco.test',
        name: 'Manager',
        role: 'manager',
      });

    const manager = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Password123!',
    });

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Billing Project',
        clientName: 'View Client',
      });

    const blocked = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .send({ projectId: project.body.project.id });
    expect(blocked.status).toBe(403);

    await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: project.body.project.id });

    const listed = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${manager.body.accessToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(1);
  });
});
