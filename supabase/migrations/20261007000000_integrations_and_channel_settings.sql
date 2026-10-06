-- ==============================================================================
-- DueFlow Complementary Migration: Integrations & Channel Preferences
-- ==============================================================================

-- 1. Add channel preference columns to profiles if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_reminder_channel TEXT NOT NULL DEFAULT 'email' CHECK (default_reminder_channel IN ('email', 'whatsapp', 'both')),
  ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Add channel column to reminder_rules if not present
ALTER TABLE public.reminder_rules
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp'));

-- 3. Add channel & provider columns to reminder_logs if not present
ALTER TABLE public.reminder_logs
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS retryable BOOLEAN DEFAULT false;

-- 4. Create integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'resend', 'whatsapp_business')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (status IN ('NOT_CONNECTED', 'CONNECTED', 'SETUP_REQUIRED', 'RECONNECT_REQUIRED')),
  provider_account_id TEXT,
  provider_email TEXT,
  provider_business_id TEXT,
  provider_phone_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_success_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);

-- 5. Enable RLS on integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
CREATE POLICY "Users can insert own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;
CREATE POLICY "Users can update own integrations"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own integrations" ON public.integrations;
CREATE POLICY "Users can delete own integrations"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);
