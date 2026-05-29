import 'dotenv/config';
import path from 'path';
import { z } from 'zod';

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const db = process.env.POSTGRES_DB;
  if (!user || !password || !db) {
    throw new Error('DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB are required');
  }

  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}`;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
  DATABASE_URL: z.string().min(1).default(buildDatabaseUrl),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(4 * 60 * 60 * 1000),
  SESSION_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
  STORAGE_PATH: z.string().default('./storage'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(50 * 1024 * 1024),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().optional(),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  STORAGE_PATH_ABS: path.resolve(parsed.data.STORAGE_PATH),
  isProduction: parsed.data.NODE_ENV === 'production',
  LOGIN_RATE_LIMIT_WINDOW_MS: parsed.data.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
  LOGIN_RATE_LIMIT_MAX:
    parsed.data.LOGIN_RATE_LIMIT_MAX ?? (parsed.data.NODE_ENV === 'production' ? 10 : 200),
};
