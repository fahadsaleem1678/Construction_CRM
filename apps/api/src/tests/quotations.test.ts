import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';

async function setup() {
  const users = new InMemoryUserStore();
  const leads = new InMemoryLeadStore();
  const quotations = new InMemoryQuotationStore();
  const app = createApp(users, leads, quotations);
  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!'
  });
  const lead = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${owner.body.accessToken}`)
    .send({ clientName: 'Acme Client', contactPhone: '+15550000001', source: 'phone' });
  return { app, token: owner.body.accessToken as string, leadId: lead.body.lead.id as string };
}

describe('phase 3 quotations', () => {
  it('creates quotations with calculated totals and moves the lead to quoted', async () => {
    const { app, token, leadId } = await setup();
    const created = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        leadId,
        taxRate: 0.1,
        items: [
          { description: 'Concrete work', unit: 'job', quantity: 1, unitPrice: 1000 },
          { description: 'Steel bars', unit: 'kg', quantity: 10, unitPrice: 25 }
        ]
      });

    expect(created.status).toBe(201);
    expect(created.body.quotation.subtotal).toBe(1250);
    expect(created.body.quotation.tax).toBe(125);
    expect(created.body.quotation.total).toBe(1375);
    expect(created.body.quotation.quotationNumber).toBe('QT-00001');

    const lead = await request(app).get(`/api/leads/${leadId}`).set('Authorization', `Bearer ${token}`);
    expect(lead.body.lead.status).toBe('quoted');
  });

  it('supports sent and accepted transitions and blocks finalized changes', async () => {
    const { app, token, leadId } = await setup();
    const created = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${token}`)
      .send({ leadId, items: [{ description: 'Design', unit: 'job', quantity: 1, unitPrice: 500 }] });

    const sent = await request(app)
      .post(`/api/quotations/${created.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sent' });
    expect(sent.body.quotation.status).toBe('sent');

    const accepted = await request(app)
      .post(`/api/quotations/${created.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });
    expect(accepted.body.quotation.status).toBe('accepted');

    const blocked = await request(app)
      .post(`/api/quotations/${created.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });
    expect(blocked.status).toBe(400);
  });
});
