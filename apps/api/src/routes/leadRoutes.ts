import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import type { LeadService } from '../leads/leadService.js';
import { createLeadSchema, leadListQuerySchema, updateLeadSchema } from '../leads/leadSchemas.js';

export function leadRoutes(leads: LeadService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/', async (req, res, next) => {
    try {
      const query = leadListQuerySchema.parse(req.query);
      res.json(await leads.list(query, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const lead = await leads.create(createLeadSchema.parse(req.body), req.user!);
      res.status(201).json({ lead });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      res.json(await leads.get(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const lead = await leads.update(req.params.id, updateLeadSchema.parse(req.body), req.user!);
      res.json({ lead });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await leads.delete(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/start-quotation', async (req, res, next) => {
    try {
      res.status(201).json(await leads.startQuotation(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
