import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, '..', '..');
const workspaceRoot = resolve(apiRoot, '..', '..');

for (const envPath of [resolve(workspaceRoot, '.env'), resolve(apiRoot, '.env')]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  APP_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  INVOICE_EMAIL_FROM: z.string().email().optional(),
  INVOICE_REPLY_TO: z.string().email().optional(),
  INVOICE_REMINDER_CRON: z.string().default('0 * * * *'),
  DOCUMENT_STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  DOCUMENT_MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  R2_ENDPOINT: z.string().url().optional(),
  R2_REGION: z.string().default('auto'),
  R2_BUCKET: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(24).default('local-access-secret-change-before-deploy'),
  JWT_REFRESH_SECRET: z.string().min(24).default('local-refresh-secret-change-before-deploy')
});

const parsedEnv = envSchema.parse(process.env);
const appOrigins = [
  parsedEnv.APP_ORIGIN,
  ...(parsedEnv.APP_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const env = {
  ...parsedEnv,
  APP_ORIGINS: [...new Set(appOrigins)],
  DOCUMENT_MAX_FILE_SIZE_BYTES: Math.round(parsedEnv.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024),
  SUPABASE_AUTH_ENABLED: parsedEnv.NODE_ENV === 'test' ? false : parsedEnv.SUPABASE_AUTH_ENABLED
};
