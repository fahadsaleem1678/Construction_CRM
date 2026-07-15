import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';
import { PrismaEmployeeStore } from '../employees/prismaEmployeeStore.js';
import { InMemoryExpenseStore } from '../expenses/inMemoryExpenseStore.js';
import { InMemoryLeadStore } from '../leads/inMemoryLeadStore.js';
import { prisma } from '../db/prisma.js';
import { InMemoryDocumentStore } from '../documents/inMemoryDocumentStore.js';
import { InMemoryInvoiceStore } from '../invoices/inMemoryInvoiceStore.js';
import { InMemoryProjectStore } from '../projects/inMemoryProjectStore.js';
import { InMemoryQuotationStore } from '../quotations/inMemoryQuotationStore.js';
import { MemoryDocumentStorage } from './helpers/memoryDocumentStorage.js';
import { MockInvoiceNotifier } from './helpers/mockInvoiceNotifier.js';

async function setup() {
  const userStore = new InMemoryUserStore();
  const leadStore = new InMemoryLeadStore();
  const quotationStore = new InMemoryQuotationStore();
  const projectStore = new InMemoryProjectStore();
  const expenseStore = new InMemoryExpenseStore();
  const invoiceStore = new InMemoryInvoiceStore();
  const documentStore = new InMemoryDocumentStore();
  const storage = new MemoryDocumentStorage();
  const app = createApp(
    userStore,
    leadStore,
    quotationStore,
    projectStore,
    expenseStore,
    invoiceStore,
    new MockInvoiceNotifier(),
    new PrismaEmployeeStore(prisma),
    documentStore,
    storage,
  );

  const owner = await request(app).post('/api/auth/register-owner').send({
    email: 'owner@buildco.test',
    name: 'Owner',
    password: 'Password123!',
  });

  return { app, token: owner.body.accessToken as string, storage };
}

describe('phase 8 documents', () => {
  it('creates, uploads, completes, lists, downloads, and deletes a project document', async () => {
    const { app, token, storage } = await setup();

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Docs Project',
        clientName: 'Preview Client',
      });

    const created = await request(app)
      .post('/api/documents/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entityType: 'project',
        entityId: project.body.project.id,
        fileName: 'site-plan.pdf',
        mimeType: 'application/pdf',
        fileSize: 11,
      });

    expect(created.status).toBe(201);
    expect(created.body.document.fileName).toBe('site-plan.pdf');

    const upload = await request(app)
      .put(`/api/documents/${created.body.document.id}/content`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('hello world'));
    expect(upload.status).toBe(204);

    const complete = await request(app)
      .post(`/api/documents/${created.body.document.id}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(complete.status).toBe(200);
    expect(complete.body.document.uploadedAt).toEqual(expect.any(String));

    const listed = await request(app)
      .get(`/api/documents?entityType=project&entityId=${project.body.project.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.documents).toHaveLength(1);

    const downloaded = await request(app)
      .get(`/api/documents/${created.body.document.id}/download`)
      .set('Authorization', `Bearer ${token}`);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(downloaded.body).toString()).toBe('hello world');

    const removed = await request(app)
      .delete(`/api/documents/${created.body.document.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);
    expect(storage.contents.size).toBe(0);
  });

  it('blocks employees from creating document uploads', async () => {
    const { app, token } = await setup();

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'worker@buildco.test',
        name: 'Worker',
        role: 'employee',
      });

    const employee = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Password123!',
    });

    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Restricted Docs Project',
        clientName: 'Preview Client',
      });

    const blocked = await request(app)
      .post('/api/documents/uploads')
      .set('Authorization', `Bearer ${employee.body.accessToken}`)
      .send({
        entityType: 'project',
        entityId: project.body.project.id,
        fileName: 'forbidden.pdf',
        mimeType: 'application/pdf',
        fileSize: 10,
      });

    expect(blocked.status).toBe(403);
  });
});
