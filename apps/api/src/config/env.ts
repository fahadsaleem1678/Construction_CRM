import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(24).default('local-access-secret-change-before-deploy'),
  JWT_REFRESH_SECRET: z.string().min(24).default('local-refresh-secret-change-before-deploy')
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  SUPABASE_AUTH_ENABLED: parsedEnv.NODE_ENV === 'test' ? false : parsedEnv.SUPABASE_AUTH_ENABLED
};
