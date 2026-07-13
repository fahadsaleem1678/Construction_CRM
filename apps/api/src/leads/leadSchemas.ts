import { z } from 'zod';

export const leadStatusSchema = z.enum(['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost']);
export const leadSourceSchema = z.enum(['walk_in', 'referral', 'website', 'phone', 'social', 'other']);

export const leadListQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  assignedTo: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createLeadSchema = z.object({
  clientName: z.string().min(2),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email().nullable().optional(),
  source: leadSourceSchema,
  status: leadStatusSchema.default('new'),
  estimatedValue: z.coerce.number().min(0).default(0),
  assignedTo: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const updateLeadSchema = createLeadSchema.partial();
