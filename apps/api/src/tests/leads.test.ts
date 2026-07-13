import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';

async function createUser(app: ReturnType<typeof createApp>, ownerToken: string, role: 'manager' | 'employee' | 'accountant') {
  const invite = await request(app)
    .post('/api/auth/invite')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      email: `${role}@buildco.test`,
      name: `${role} user`,
      role
    });

  const accepted = await request(app).post('/api/auth/accept-invite').send({
    token: invite.body.inviteToken,
    password: 'Password123!'
  });

  return { token: accepted.body.accessToken as string, user: accepted.body.user as { id: string } };
}

async function setup() {
  const userStore = new InMemoryUserStore();
  const leadStore = new InMemoryLeadStore();
  const app = createApp(userStore, leadStore);
  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!'
  });
  return { app, ownerToken: owner.body.accessToken as string };
}

describe('phase 2 leads', () => {
  it('lets managers create, filter, update, and start a quotation from a lead', async () => {
    const { app, ownerToken } = await setup();
    const manager = await createUser(app, ownerToken, 'manager');

    const created = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        clientName: 'Acme Builders',
        contactPhone: '+15551234567',
        contactEmail: 'client@acme.test',
        source: 'referral',
        estimatedValue: 125000,
        notes: 'Needs a site visit next week'
      });

    expect(created.status).toBe(201);
    expect(created.body.lead.status).toBe('new');

    const listed = await request(app)
      .get('/api/leads?status=new&source=referral&page=1&pageSize=10')
      .set('Authorization', `Bearer ${manager.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(1);

    const updated = await request(app)
      .patch(`/api/leads/${created.body.lead.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'site_visit' });
    expect(updated.status).toBe(200);
    expect(updated.body.lead.status).toBe('site_visit');

    const quote = await request(app)
      .post(`/api/leads/${created.body.lead.id}/start-quotation`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send();
    expect(quote.status).toBe(201);
    expect(quote.body.lead.status).toBe('quoted');
    expect(quote.body.quotationDraft.leadId).toBe(created.body.lead.id);

    const detail = await request(app)
      .get(`/api/leads/${created.body.lead.id}`)
      .set('Authorization', `Bearer ${manager.token}`);
    expect(detail.body.activities.map((activity: { action: string }) => activity.action)).toContain('quotation_started');
  });

  it('limits employees to assigned leads and blocks accountant access', async () => {
    const { app, ownerToken } = await setup();
    const employee = await createUser(app, ownerToken, 'employee');
    const accountant = await createUser(app, ownerToken, 'accountant');

    const assigned = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Assigned Client',
        contactPhone: '+15550000001',
        source: 'phone',
        assignedTo: employee.user.id
      });

    await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Unassigned Client',
        contactPhone: '+15550000002',
        source: 'website'
      });

    const employeeList = await request(app).get('/api/leads').set('Authorization', `Bearer ${employee.token}`);
    expect(employeeList.status).toBe(200);
    expect(employeeList.body.total).toBe(1);
    expect(employeeList.body.leads[0].id).toBe(assigned.body.lead.id);

    const employeeCreate = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({ clientName: 'Blocked', contactPhone: '+15550000003', source: 'phone' });
    expect(employeeCreate.status).toBe(403);

    const accountantList = await request(app).get('/api/leads').set('Authorization', `Bearer ${accountant.token}`);
    expect(accountantList.status).toBe(403);
  });
});
