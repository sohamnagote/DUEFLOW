-- ==============================================================================
-- DueFlow Production Database Schema & RLS Policies
-- India-first automated invoice follow-up SaaS
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Extends auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  upi_id TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  reminder_default TEXT NOT NULL DEFAULT 'cadence_default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. CLIENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  notes TEXT DEFAULT '',
  cin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  attn TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for user client lookups
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(user_id, lower(email));

-- ------------------------------------------------------------------------------
-- 3. INVOICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name_snapshot TEXT NOT NULL,
  client_email_snapshot TEXT NOT NULL,
  invoice_number TEXT NOT NULL CHECK (char_length(trim(invoice_number)) > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 100000000),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'due_soon', 'overdue', 'paid', 'cancelled')),
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  template_key TEXT NOT NULL DEFAULT 'cadence_default',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_invoice_number UNIQUE(user_id, invoice_number),
  CONSTRAINT chk_due_date_after_issue CHECK (due_date >= issue_date)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- ------------------------------------------------------------------------------
-- 4. REMINDER RULES TABLE (Planned cadence occurrences)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  offset_days INT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('before', 'after', 'on')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  occurrence_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'skipped', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_invoice_occurrence UNIQUE (invoice_id, occurrence_key)
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_invoice_id ON public.reminder_rules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_due_worker ON public.reminder_rules(status, scheduled_for) WHERE status = 'pending';

-- ------------------------------------------------------------------------------
-- 5. REMINDER LOGS TABLE (Execution delivery audit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.reminder_rules(id) ON DELETE SET NULL,
  occurrence_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'sent', 'bounced', 'complained', 'failed')),
  error_code TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_invoice_id ON public.reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_occurrence ON public.reminder_logs(invoice_id, occurrence_key);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_provider_id ON public.reminder_logs(provider_message_id);

-- ------------------------------------------------------------------------------
-- 6. AI ACTIONS / AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  prompt_summary TEXT,
  model_used TEXT NOT NULL,
  generated_subject TEXT,
  generated_body TEXT,
  tokens_used INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id ON public.ai_actions(user_id);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. AUTO-PROVISION PROFILE ON AUTH SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    business_name = CASE WHEN profiles.business_name = '' THEN EXCLUDED.business_name ELSE profiles.business_name END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Clients: Users can only view, insert, update, delete their own clients
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = user_id);

-- Invoices: Users can only view, insert, update, delete their own invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Reminder Rules: Derived via parent invoice user_id
CREATE POLICY "Users can view reminder rules for their invoices"
  ON public.reminder_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = reminder_rules.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage reminder rules for their invoices"
  ON public.reminder_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = reminder_rules.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Reminder Logs: Derived via parent invoice user_id
CREATE POLICY "Users can view reminder logs for their invoices"
  ON public.reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = reminder_logs.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- AI Actions: Users can view their own AI generation history
CREATE POLICY "Users can view own AI actions"
  ON public.ai_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI actions"
  ON public.ai_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
