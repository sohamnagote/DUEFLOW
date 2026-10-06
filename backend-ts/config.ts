import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Gemini AI
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  // Supabase
  SUPABASE_URL: z.string().optional().default(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
  SUPABASE_SECRET_KEY: z.string().optional().default(process.env.SUPABASE_SECRET_KEY || ''),
  SUPABASE_ANON_KEY: z.string().optional().default(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('DueFlow Reminders <reminders@dueflow.in>'),
  // Cron & Webhook
  CRON_SECRET: z.string().default('dueflow_cron_dev_secret_2026'),
  APP_BASE_URL: z.string().default(process.env.APP_URL || 'http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid server configuration:', parsed.error.format());
}

export const config = parsed.success ? parsed.data : {
  PORT: 3000,
  NODE_ENV: 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'DueFlow Reminders <reminders@dueflow.in>',
  CRON_SECRET: process.env.CRON_SECRET || 'dueflow_cron_dev_secret_2026',
  APP_BASE_URL: process.env.APP_URL || 'http://localhost:3000',
};
