import type { DocumentListQuery } from '@construction-crm/shared-types';
import type { CreateDocumentInput, DocumentStore, StoredDocument } from './documentStore.js';

function toStoredDocument(document: {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  storageKey: string;
  storageProvider: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
  uploadedAt: Date | null;
}): StoredDocument {
  return {
    id: document.id,
    entityType: document.entityType as StoredDocument['entityType'],
    entityId: document.entityId,
    fileName: document.fileName,
    storageKey: document.storageKey,
    storageProvider: document.storageProvider as StoredDocument['storageProvider'],
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    uploadedBy: document.uploadedBy,
    createdAt: document.createdAt.toISOString(),
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
  };
}

export class PrismaDocumentStore implements DocumentStore {
  constructor(private readonly prisma: {
    document: {
      findMany: (input: unknown) => Promise<Array<{
        id: string;
        entityType: string;
        entityId: string;
        fileName: string;
        storageKey: string;
        storageProvider: string;
        fileSize: number;
        mimeType: string;
        uploadedBy: string;
        createdAt: Date;
        uploadedAt: Date | null;
      }>>;
      findUnique: (input: unknown) => Promise<{
        id: string;
        entityType: string;
        entityId: string;
        fileName: string;
        storageKey: string;
        storageProvider: string;
        fileSize: number;
        mimeType: string;
        uploadedBy: string;
        createdAt: Date;
        uploadedAt: Date | null;
      } | null>;
      create: (input: unknown) => Promise<{
        id: string;
        entityType: string;
        entityId: string;
        fileName: string;
        storageKey: string;
        storageProvider: string;
        fileSize: number;
        mimeType: string;
        uploadedBy: string;
        createdAt: Date;
        uploadedAt: Date | null;
      }>;
      update: (input: unknown) => Promise<{
        id: string;
        entityType: string;
        entityId: string;
        fileName: string;
        storageKey: string;
        storageProvider: string;
        fileSize: number;
        mimeType: string;
        uploadedBy: string;
        createdAt: Date;
        uploadedAt: Date | null;
      }>;
      deleteMany: (input: unknown) => Promise<{ count: number }>;
    };
  }) {}

  async list(query: DocumentListQuery) {
    const documents = await this.prisma.document.findMany({
      where: {
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(toStoredDocument);
  }

  async findById(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    return document ? toStoredDocument(document) : null;
  }

  async create(input: CreateDocumentInput) {
    const document = await this.prisma.document.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName,
        storageKey: input.storageKey,
        storageProvider: input.storageProvider,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        uploadedBy: input.uploadedBy,
      },
    });
    return toStoredDocument(document);
  }

  async markUploaded(id: string, uploadedAt: string) {
    const document = await this.prisma.document.update({
      where: { id },
      data: { uploadedAt: new Date(uploadedAt) },
    }).catch(() => null);
    return document ? toStoredDocument(document) : null;
  }

  async delete(id: string) {
    const result = await this.prisma.document.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
