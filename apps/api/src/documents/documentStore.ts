import type {
  CreateDocumentUploadRequest,
  DocumentEntityType,
  DocumentListQuery,
  DocumentRecord,
  DocumentStorageProvider,
} from '@construction-crm/shared-types';

export type StoredDocument = DocumentRecord & {
  storageKey: string;
};

export type CreateDocumentInput = CreateDocumentUploadRequest & {
  storageKey: string;
  storageProvider: DocumentStorageProvider;
  uploadedBy: string;
};

export interface DocumentStore {
  list(query: DocumentListQuery): Promise<StoredDocument[]>;
  findById(id: string): Promise<StoredDocument | null>;
  create(input: CreateDocumentInput): Promise<StoredDocument>;
  markUploaded(id: string, uploadedAt: string): Promise<StoredDocument | null>;
  delete(id: string): Promise<boolean>;
}
