import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import type { ProjectService } from '../projects/projectService.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectListQuerySchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createAssignmentSchema,
  updateAssignmentSchema
} from '../projects/projectSchemas.js';

export function projectRoutes(projects: ProjectService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  // ── Project CRUD ────────────────────────────────────────────────

  router.get('/', async (req, res, next) => {
    try {
      const query = projectListQuerySchema.parse(req.query);
      res.json(await projects.list(query, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const project = await projects.create(createProjectSchema.parse(req.body), req.user!);
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.post('/from-quotation', async (req, res, next) => {
    try {
      const { quotationId } = req.body as { quotationId: string };
      if (!quotationId) return res.status(400).json({ message: 'quotationId is required' });
      const project = await projects.createFromQuotation(quotationId, req.user!);
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      res.json(await projects.get(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const project = await projects.update(req.params.id, updateProjectSchema.parse(req.body), req.user!);
      res.json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await projects.remove(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ── Milestones ──────────────────────────────────────────────────

  router.post('/:id/milestones', async (req, res, next) => {
    try {
      const milestone = await projects.addMilestone(req.params.id, createMilestoneSchema.parse(req.body), req.user!);
      res.status(201).json({ milestone });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/milestones/:mid', async (req, res, next) => {
    try {
      const milestone = await projects.updateMilestone(req.params.id, req.params.mid, updateMilestoneSchema.parse(req.body), req.user!);
      res.json({ milestone });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id/milestones/:mid', async (req, res, next) => {
    try {
      await projects.removeMilestone(req.params.id, req.params.mid, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ── Assignments ─────────────────────────────────────────────────

  router.post('/:id/assignments', async (req, res, next) => {
    try {
      const assignment = await projects.addAssignment(req.params.id, createAssignmentSchema.parse(req.body), req.user!);
      res.status(201).json({ assignment });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/assignments/:aid', async (req, res, next) => {
    try {
      const assignment = await projects.updateAssignment(req.params.id, req.params.aid, updateAssignmentSchema.parse(req.body), req.user!);
      res.json({ assignment });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id/assignments/:aid', async (req, res, next) => {
    try {
      await projects.removeAssignment(req.params.id, req.params.aid, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
