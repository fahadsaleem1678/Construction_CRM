import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().default(''),
  limit: z.coerce.number().int().min(1).max(12).default(8),
});
