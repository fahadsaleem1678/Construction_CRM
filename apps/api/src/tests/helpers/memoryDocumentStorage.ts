import type { DocumentStorage, DocumentUploadTarget, DownloadResult } from '../../documents/documentStorage.js';
import type { StoredDocument } from '../../documents/documentStore.js';

export class MemoryDocumentStorage implements DocumentStorage {
  readonly provider = 'local' as const;
  readonly contents = new Map<string, Buffer>();

  async createUploadTarget(document: StoredDocument): Promise<DocumentUploadTarget> {
    return {
      method: 'PUT',
      url: `/api/documents/${document.id}/content`,
      headers: { 'Content-Type': document.mimeType },
    };
  }

  async saveUploadContent(document: StoredDocument, buffer: Buffer) {
    this.contents.set(document.storageKey, buffer);
  }

  async finalizeUpload(document: StoredDocument) {
    if (!this.contents.has(document.storageKey)) {
      throw new Error('Uploaded file was not found');
    }
  }

  async openDownload(document: StoredDocument): Promise<DownloadResult> {
    const buffer = this.contents.get(document.storageKey);
    if (!buffer) throw new Error('Uploaded file was not found');
    return {
      kind: 'buffer',
      buffer,
      contentType: document.mimeType,
      fileName: document.fileName,
    };
  }

  async deleteObject(document: StoredDocument) {
    this.contents.delete(document.storageKey);
  }
}
