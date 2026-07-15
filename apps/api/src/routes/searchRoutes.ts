import { Router } from 'express';
import type { UserStore } from '../auth/userStore.js';
import { authenticate } from '../middleware/authenticate.js';
import { globalSearchQuerySchema } from '../search/searchSchemas.js';
import type { SearchService } from '../search/searchService.js';

export function searchRoutes(search: SearchService, userStore: UserStore) {
  const router = Router();
  router.use(authenticate(userStore));

  router.get('/', async (req, res, next) => {
    try {
      const query = globalSearchQuerySchema.parse(req.query);
      res.json(await search.search(req.user!, query.q, query.limit));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
