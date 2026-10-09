-- ==============================================================================
-- DueFlow 2.0 Migration: Custom Reminder Schedules & Email Templates
-- ==============================================================================

-- Add custom reminder schedule preferences and email template customization to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_schedule_rules TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_email_subject TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_email_body TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_tone VARCHAR(32) DEFAULT 'professional';

COMMENT ON COLUMN public.profiles.reminder_schedule_rules IS 'User-defined custom reminder rules JSON array [{direction, offset_days, send_time, enabled}]';
COMMENT ON COLUMN public.profiles.custom_email_subject IS 'Custom email subject template with placeholder interpolation';
COMMENT ON COLUMN public.profiles.custom_email_body IS 'Custom email body template with placeholder interpolation';
COMMENT ON COLUMN public.profiles.email_tone IS 'Reminder email tone: friendly, professional, or firm';
