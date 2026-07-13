import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';
import { InMemoryProjectStore } from '../projects/inMemoryProjectStore.js';

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
  const quotationStore = new InMemoryQuotationStore();
  const projectStore = new InMemoryProjectStore();
  const app = createApp(userStore, leadStore, quotationStore, projectStore);
  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!'
  });
  return { app, ownerToken: owner.body.accessToken as string };
}

describe('phase 4 projects', () => {
  it('lets managers create, update, and manage milestones and assignments', async () => {
    const { app, ownerToken } = await setup();
    const manager = await createUser(app, ownerToken, 'manager');

    // Create a project
    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        name: 'Villa Construction',
        clientName: 'Acme Builders',
        budget: 500000,
        address: '123 Main St'
      });

    expect(created.status).toBe(201);
    expect(created.body.project.name).toBe('Villa Construction');
    expect(created.body.project.status).toBe('planning');
    expect(created.body.project.budget).toBe(500000);

    // List projects
    const listed = await request(app)
      .get('/api/projects?page=1&pageSize=10')
      .set('Authorization', `Bearer ${manager.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(1);

    // Update project status
    const updated = await request(app)
      .patch(`/api/projects/${created.body.project.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'in_progress', progress: 10 });
    expect(updated.status).toBe(200);
    expect(updated.body.project.status).toBe('in_progress');
    expect(updated.body.project.progress).toBe(10);

    // Add milestone
    const milestone = await request(app)
      .post(`/api/projects/${created.body.project.id}/milestones`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: 'Foundation Complete' });
    expect(milestone.status).toBe(201);
    expect(milestone.body.milestone.title).toBe('Foundation Complete');
    expect(milestone.body.milestone.status).toBe('pending');

    // Update milestone to completed
    const milestoneUpdated = await request(app)
      .patch(`/api/projects/${created.body.project.id}/milestones/${milestone.body.milestone.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'completed' });
    expect(milestoneUpdated.status).toBe(200);
    expect(milestoneUpdated.body.milestone.status).toBe('completed');
    expect(milestoneUpdated.body.milestone.completedAt).toBeTruthy();

    // Add assignment
    const employee = await createUser(app, ownerToken, 'employee');
    const assignment = await request(app)
      .post(`/api/projects/${created.body.project.id}/assignments`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: employee.user.id, roleOnProject: 'Site Supervisor' });
    expect(assignment.status).toBe(201);
    expect(assignment.body.assignment.roleOnProject).toBe('Site Supervisor');

    // Get project detail — should include milestones and assignments
    const detail = await request(app)
      .get(`/api/projects/${created.body.project.id}`)
      .set('Authorization', `Bearer ${manager.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.project.milestones).toHaveLength(1);
    expect(detail.body.project.assignments).toHaveLength(1);
    expect(detail.body.activities.length).toBeGreaterThanOrEqual(1);

    // Delete milestone
    const milestoneDeleted = await request(app)
      .delete(`/api/projects/${created.body.project.id}/milestones/${milestone.body.milestone.id}`)
      .set('Authorization', `Bearer ${manager.token}`);
    expect(milestoneDeleted.status).toBe(204);
  });

  it('creates a project from an accepted quotation and marks lead as won', async () => {
    const { app, ownerToken } = await setup();

    // Create lead
    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientName: 'Won Client',
        contactPhone: '+15551234567',
        source: 'referral',
        estimatedValue: 200000
      });

    // Create quotation
    const quotation = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        leadId: lead.body.lead.id,
        items: [{ description: 'Foundation work', unit: 'sqft', quantity: 1000, unitPrice: 50 }]
      });

    // Accept quotation
    await request(app)
      .post(`/api/quotations/${quotation.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'accepted' });

    // Create project from quotation
    const project = await request(app)
      .post('/api/projects/from-quotation')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quotationId: quotation.body.quotation.id });

    expect(project.status).toBe(201);
    expect(project.body.project.quotationId).toBe(quotation.body.quotation.id);
    expect(project.body.project.leadId).toBe(lead.body.lead.id);
    expect(project.body.project.budget).toBeGreaterThan(0);

    // Verify lead is now 'won'
    const updatedLead = await request(app)
      .get(`/api/leads/${lead.body.lead.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(updatedLead.body.lead.status).toBe('won');
  });

  it('restricts employee to assigned projects and blocks accountant from creating', async () => {
    const { app, ownerToken } = await setup();
    const employee = await createUser(app, ownerToken, 'employee');
    const accountant = await createUser(app, ownerToken, 'accountant');

    // Owner creates two projects
    const assigned = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Assigned Project', clientName: 'Client A' });

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Unassigned Project', clientName: 'Client B' });

    // Assign employee to one project
    await request(app)
      .post(`/api/projects/${assigned.body.project.id}/assignments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: employee.user.id, roleOnProject: 'Worker' });

    // Employee should see only assigned project
    const employeeList = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${employee.token}`);
    expect(employeeList.status).toBe(200);
    expect(employeeList.body.total).toBe(1);
    expect(employeeList.body.projects[0].id).toBe(assigned.body.project.id);

    // Employee cannot create projects
    const employeeCreate = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({ name: 'Blocked', clientName: 'No' });
    expect(employeeCreate.status).toBe(403);

    // Accountant can view projects but not create
    const accountantList = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${accountant.token}`);
    expect(accountantList.status).toBe(200);

    const accountantCreate = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accountant.token}`)
      .send({ name: 'Blocked', clientName: 'No' });
    expect(accountantCreate.status).toBe(403);

    // Only owner/admin can delete
    const managerDeleteAttempt = await request(app)
      .delete(`/api/projects/${assigned.body.project.id}`)
      .set('Authorization', `Bearer ${(await createUser(app, ownerToken, 'manager')).token}`);
    expect(managerDeleteAttempt.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/api/projects/${assigned.body.project.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerDelete.status).toBe(204);
  });
});
