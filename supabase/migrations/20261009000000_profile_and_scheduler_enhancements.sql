-- ==============================================================================
-- DueFlow Production Migration: Profile Payment Coordinates & Durable Scheduler
-- ==============================================================================

-- 1. Add Business Profile & Payment Coordinates columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT DEFAULT '';

-- 2. Add Concurrency & Retry columns to reminder_rules
ALTER TABLE public.reminder_rules
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Add Index for high-performance atomic worker claims
CREATE INDEX IF NOT EXISTS idx_reminder_rules_claim 
  ON public.reminder_rules(status, enabled, scheduled_for);

-- 4. Add Index on reminder_logs for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_reminder_logs_idempotency
  ON public.reminder_logs(invoice_id, occurrence_key, status);
