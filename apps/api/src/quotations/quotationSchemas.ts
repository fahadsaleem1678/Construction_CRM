import { z } from 'zod';

export const quotationStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);

const itemSchema = z.object({
  description: z.string().min(2),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0)
});

export const createQuotationSchema = z.object({
  leadId: z.string().uuid(),
  validUntil: z.string().datetime().nullable().optional(),
  taxRate: z.coerce.number().min(0).max(1).default(0.16),
  items: z.array(itemSchema).min(1)
});

export const updateQuotationSchema = z.object({
  validUntil: z.string().datetime().nullable().optional(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  items: z.array(itemSchema).min(1).optional()
});
