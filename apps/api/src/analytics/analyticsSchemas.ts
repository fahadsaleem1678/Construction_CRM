import { z } from 'zod';

export const dashboardAnalyticsQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(12).default(6),
});
