import { z } from 'zod';
import { documentEntityTypes } from '@construction-crm/shared-types';

export const documentListQuerySchema = z.object({
  entityType: z.enum(documentEntityTypes).optional(),
  entityId: z.string().uuid().optional(),
});

export const createDocumentUploadSchema = z.object({
  entityType: z.enum(documentEntityTypes),
  entityId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive(),
});
