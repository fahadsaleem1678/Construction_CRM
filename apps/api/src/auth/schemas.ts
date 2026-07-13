import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters');

export const registerOwnerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'manager', 'employee', 'accountant'])
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  password
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password
});
