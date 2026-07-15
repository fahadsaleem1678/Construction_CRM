import { randomUUID } from 'node:crypto';
import type {
  AuthUser,
  CreateDocumentUploadRequest,
  DocumentEntityType,
  DocumentListQuery,
} from '@construction-crm/shared-types';
import { AppError, forbidden } from '../auth/errors.js';
import type { EmployeeStore } from '../employees/employeeStore.js';
import type { InvoiceStore } from '../invoices/invoiceStore.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { ProjectStore } from '../projects/projectStore.js';
import type { DocumentStorage } from './documentStorage.js';
import type { DocumentStore, StoredDocument } from './documentStore.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MANAGE_ROLES = ['owner', 'admin', 'manager', 'accountant'] as const;

function canManage(user: AuthUser) {
  return MANAGE_ROLES.includes(user.role as (typeof MANAGE_ROLES)[number]);
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}

function toPublicDocument(document: StoredDocument) {
  return {
    id: document.id,
    entityType: document.entityType,
    entityId: document.entityId,
    fileName: document.fileName,
    storageProvider: document.storageProvider,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    uploadedBy: document.uploadedBy,
    createdAt: document.createdAt,
    uploadedAt: document.uploadedAt,
  };
}

export class DocumentService {
  constructor(
    private readonly documents: DocumentStore,
    private readonly storage: DocumentStorage,
    private readonly leads: LeadStore,
    private readonly projects: ProjectStore,
    private readonly employees: EmployeeStore,
    private readonly invoices: InvoiceStore,
    private readonly maxFileSizeBytes: number,
  ) {}

  async list(query: DocumentListQuery, user: AuthUser) {
    if (!canManage(user)) throw forbidden('You do not have access to documents');
    const documents = await this.documents.list(query);
    return { documents: documents.map(toPublicDocument) };
  }

  async createUpload(input: CreateDocumentUploadRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only managers and finance roles can upload documents');
    await this.assertEntityExists(input.entityType, input.entityId);

    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new AppError(400, 'This file type is not supported');
    }
    if (input.fileSize > this.maxFileSizeBytes) {
      throw new AppError(400, `Files must be ${Math.round(this.maxFileSizeBytes / (1024 * 1024))}MB or smaller`);
    }

    const fileName = sanitizeFileName(input.fileName);
    if (!fileName) throw new AppError(400, 'A valid file name is required');

    const document = await this.documents.create({
      ...input,
      fileName,
      storageProvider: this.storage.provider,
      storageKey: `${input.entityType}/${input.entityId}/${randomUUID()}-${fileName}`,
      uploadedBy: user.id,
    });

    return {
      document: toPublicDocument(document),
      upload: await this.storage.createUploadTarget(document),
    };
  }

  async uploadContent(id: string, body: Buffer, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only managers and finance roles can upload documents');
    const document = await this.requireDocument(id);
    if (document.storageProvider !== 'local') {
      throw new AppError(400, 'Direct content upload is only available for local storage');
    }
    if (body.length === 0) throw new AppError(400, 'No file data was uploaded');
    if (body.length > this.maxFileSizeBytes) {
      throw new AppError(400, `Files must be ${Math.round(this.maxFileSizeBytes / (1024 * 1024))}MB or smaller`);
    }
    await this.storage.saveUploadContent(document, body);
  }

  async completeUpload(id: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only managers and finance roles can complete uploads');
    const document = await this.requireDocument(id);
    await this.storage.finalizeUpload(document);
    const updated = await this.documents.markUploaded(id, new Date().toISOString());
    if (!updated) throw new AppError(404, 'Document not found');
    return { document: toPublicDocument(updated) };
  }

  async download(id: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('You do not have access to documents');
    const document = await this.requireDocument(id);
    if (!document.uploadedAt) {
      throw new AppError(409, 'This document upload has not been completed yet');
    }
    return this.storage.openDownload(document);
  }

  async remove(id: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only managers and finance roles can remove documents');
    const document = await this.requireDocument(id);
    await this.storage.deleteObject(document).catch(() => {});
    await this.documents.delete(id);
  }

  private async assertEntityExists(entityType: DocumentEntityType, entityId: string) {
    const exists = await (async () => {
      switch (entityType) {
        case 'lead':
          return Boolean(await this.leads.findById(entityId));
        case 'project':
          return Boolean(await this.projects.findById(entityId));
        case 'employee':
          return Boolean(await this.employees.getEmployeeById(entityId));
        case 'invoice':
          return Boolean(await this.invoices.findById(entityId));
      }
    })();

    if (!exists) {
      throw new AppError(404, `${entityType[0]!.toUpperCase()}${entityType.slice(1)} not found`);
    }
  }

  private async requireDocument(id: string) {
    const document = await this.documents.findById(id);
    if (!document) throw new AppError(404, 'Document not found');
    return document;
  }
}
