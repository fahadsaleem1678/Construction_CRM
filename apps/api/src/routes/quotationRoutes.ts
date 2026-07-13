import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import type { QuotationService } from '../quotations/quotationService.js';
import { createQuotationSchema, quotationStatusSchema, updateQuotationSchema } from '../quotations/quotationSchemas.js';

export function quotationRoutes(quotations: QuotationService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/', async (req, res, next) => {
    try {
      res.json(await quotations.list(req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const quotation = await quotations.create(createQuotationSchema.parse(req.body), req.user!);
      res.status(201).json({ quotation });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      res.json({ quotation: await quotations.get(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const quotation = await quotations.update(req.params.id, updateQuotationSchema.parse(req.body), req.user!);
      res.json({ quotation });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/status', async (req, res, next) => {
    try {
      const status = quotationStatusSchema.parse(req.body.status);
      const quotation = await quotations.transition(req.params.id, status, req.user!);
      res.json({ quotation });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await quotations.remove(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
