import { z } from 'zod';

export const projectStatusSchema = z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']);
export const milestoneStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const projectListQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createProjectSchema = z.object({
  name: z.string().min(2),
  clientName: z.string().min(2),
  leadId: z.string().uuid().nullable().optional(),
  quotationId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  budget: z.coerce.number().min(0).default(0),
  address: z.string().nullable().optional()
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  clientName: z.string().min(2).optional(),
  leadId: z.string().uuid().nullable().optional(),
  quotationId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  budget: z.coerce.number().min(0).optional(),
  address: z.string().nullable().optional(),
  status: projectStatusSchema.optional(),
  progress: z.coerce.number().int().min(0).max(100).optional()
});

export const createMilestoneSchema = z.object({
  title: z.string().min(2),
  dueDate: z.string().datetime().nullable().optional()
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(2).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: milestoneStatusSchema.optional()
});

export const createAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleOnProject: z.string().min(1)
});

export const updateAssignmentSchema = z.object({
  userId: z.string().uuid().optional(),
  roleOnProject: z.string().min(1).optional()
}).refine((input) => input.userId !== undefined || input.roleOnProject !== undefined, {
  message: 'At least one assignment field is required'
});
