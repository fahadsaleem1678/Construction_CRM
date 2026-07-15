import express, { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import type { UserStore } from '../auth/userStore.js';
import type { DocumentService } from '../documents/documentService.js';
import { createDocumentUploadSchema, documentListQuerySchema } from '../documents/documentSchemas.js';
import { env } from '../config/env.js';

export function documentRoutes(documents: DocumentService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/', async (req, res, next) => {
    try {
      res.json(await documents.list(documentListQuerySchema.parse(req.query), req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.post('/uploads', async (req, res, next) => {
    try {
      const result = await documents.createUpload(createDocumentUploadSchema.parse(req.body), req.user!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/:id/content',
    express.raw({ type: '*/*', limit: env.DOCUMENT_MAX_FILE_SIZE_BYTES }),
    async (req, res, next) => {
      try {
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
        await documents.uploadContent(req.params.id, body, req.user!);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/:id/complete', async (req, res, next) => {
    try {
      res.json(await documents.completeUpload(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/download', async (req, res, next) => {
    try {
      const result = await documents.download(req.params.id, req.user!);
      if (result.kind === 'redirect') {
        res.redirect(result.url);
        return;
      }

      res
        .type(result.contentType)
        .setHeader('Content-Disposition', `inline; filename="${result.fileName}"`)
        .send(result.buffer);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await documents.remove(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
