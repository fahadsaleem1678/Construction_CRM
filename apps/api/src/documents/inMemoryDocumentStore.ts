import { randomUUID } from 'node:crypto';
import type { DocumentListQuery } from '@construction-crm/shared-types';
import type { CreateDocumentInput, DocumentStore, StoredDocument } from './documentStore.js';

export class InMemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, StoredDocument>();

  async list(query: DocumentListQuery) {
    return [...this.documents.values()]
      .filter((document) => !query.entityType || document.entityType === query.entityType)
      .filter((document) => !query.entityId || document.entityId === query.entityId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findById(id: string) {
    return this.documents.get(id) ?? null;
  }

  async create(input: CreateDocumentInput) {
    const document: StoredDocument = {
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.fileName,
      storageKey: input.storageKey,
      storageProvider: input.storageProvider,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedBy: input.uploadedBy,
      createdAt: new Date().toISOString(),
      uploadedAt: null,
    };
    this.documents.set(document.id, document);
    return document;
  }

  async markUploaded(id: string, uploadedAt: string) {
    const document = this.documents.get(id);
    if (!document) return null;
    const updated = { ...document, uploadedAt };
    this.documents.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.documents.delete(id);
  }
}
