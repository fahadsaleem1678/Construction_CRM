import { z } from 'zod';

const dateString = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

export const invoiceStatusSchema = z.enum(['draft', 'sent']);

export const invoiceListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const generateInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  dueDate: dateString.nullable().optional(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  includeApprovedExpenses: z.boolean().optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusSchema,
});

export const recordInvoicePaymentSchema = z.object({
  amountPaid: z.coerce.number().min(0),
  paidDate: dateString.nullable().optional(),
});

export const sendInvoiceSchema = z.object({
  recipientEmail: z.string().email().nullable().optional(),
  message: z.string().trim().max(800).nullable().optional(),
});
