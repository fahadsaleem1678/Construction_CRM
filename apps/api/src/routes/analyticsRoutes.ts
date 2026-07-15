import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import { dashboardAnalyticsQuerySchema } from '../analytics/analyticsSchemas.js';
import type { AnalyticsService } from '../analytics/analyticsService.js';

export function analyticsRoutes(analytics: AnalyticsService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/dashboard', async (req, res, next) => {
    try {
      const query = dashboardAnalyticsQuerySchema.parse(req.query);
      res.json(await analytics.getDashboard(req.user!, query.months));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
