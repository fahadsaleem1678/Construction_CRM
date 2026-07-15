import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import type { StoredDocument } from './documentStore.js';

export type DocumentUploadTarget = {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
};

export type DownloadResult =
  | { kind: 'buffer'; buffer: Buffer; contentType: string; fileName: string }
  | { kind: 'redirect'; url: string };

export interface DocumentStorage {
  readonly provider: StoredDocument['storageProvider'];
  createUploadTarget(document: StoredDocument): Promise<DocumentUploadTarget>;
  saveUploadContent(document: StoredDocument, buffer: Buffer): Promise<void>;
  finalizeUpload(document: StoredDocument): Promise<void>;
  openDownload(document: StoredDocument): Promise<DownloadResult>;
  deleteObject(document: StoredDocument): Promise<void>;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, '..', '..');
const uploadsRoot = resolve(apiRoot, 'uploads', 'documents');

function localFilePath(document: StoredDocument) {
  return resolve(uploadsRoot, document.storageKey);
}

export class LocalDocumentStorage implements DocumentStorage {
  readonly provider = 'local' as const;

  async createUploadTarget(document: StoredDocument) {
    return {
      method: 'PUT' as const,
      url: `/api/documents/${document.id}/content`,
      headers: { 'Content-Type': document.mimeType },
    };
  }

  async saveUploadContent(document: StoredDocument, buffer: Buffer) {
    const path = localFilePath(document);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
  }

  async finalizeUpload(document: StoredDocument) {
    const path = localFilePath(document);
    const file = await stat(path).catch(() => null);
    if (!file || file.size === 0) {
      throw new Error('Uploaded file was not found');
    }
  }

  async openDownload(document: StoredDocument) {
    const buffer = await readFile(localFilePath(document));
    return {
      kind: 'buffer',
      buffer,
      contentType: document.mimeType,
      fileName: document.fileName,
    } satisfies DownloadResult;
  }

  async deleteObject(document: StoredDocument) {
    await rm(localFilePath(document), { force: true });
  }
}

export class R2DocumentStorage implements DocumentStorage {
  readonly provider = 'r2' as const;
  private readonly client: S3Client;

  constructor() {
    if (!env.R2_ENDPOINT || !env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 storage is missing required configuration');
    }

    this.client = new S3Client({
      region: env.R2_REGION,
      endpoint: env.R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async createUploadTarget(document: StoredDocument) {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: document.storageKey,
      ContentType: document.mimeType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 60 * 10 });
    return {
      method: 'PUT' as const,
      url,
      headers: { 'Content-Type': document.mimeType },
    };
  }

  async saveUploadContent() {
    throw new Error('Direct content upload is only supported by local document storage');
  }

  async finalizeUpload() {}

  async openDownload(document: StoredDocument) {
    if (env.R2_PUBLIC_BASE_URL) {
      return {
        kind: 'redirect',
        url: `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${document.storageKey}`,
      } satisfies DownloadResult;
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: document.storageKey,
      ResponseContentType: document.mimeType,
      ResponseContentDisposition: `inline; filename="${document.fileName}"`,
    });
    return {
      kind: 'redirect',
      url: await getSignedUrl(this.client, command, { expiresIn: 60 * 10 }),
    } satisfies DownloadResult;
  }

  async deleteObject(document: StoredDocument) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: document.storageKey,
    })).catch(() => {});
  }
}

export function createDocumentStorage() {
  if (env.DOCUMENT_STORAGE_DRIVER === 'r2') {
    return new R2DocumentStorage();
  }
  return new LocalDocumentStorage();
}
