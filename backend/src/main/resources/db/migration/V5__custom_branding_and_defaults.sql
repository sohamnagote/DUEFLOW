-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V5__custom_branding_and_defaults.sql)
-- Custom invoice branding fields on payment_settings and safe preference defaults
-- ==============================================================================

-- 1. Add invoice branding columns to payment_settings
ALTER TABLE payment_settings
    ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS logo_storage_path VARCHAR(500),
    ADD COLUMN IF NOT EXISTS business_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS business_address TEXT,
    ADD COLUMN IF NOT EXISTS brand_color VARCHAR(20) DEFAULT '#001126',
    ADD COLUMN IF NOT EXISTS footer_terms TEXT;

-- 2. Ensure automated_reminders_enabled defaults to TRUE for any NULL values
UPDATE user_profiles
SET automated_reminders_enabled = TRUE
WHERE automated_reminders_enabled IS NULL;

-- 3. Index for user lookup on payment_settings is already present; add index for brand lookups if needed
CREATE INDEX IF NOT EXISTS idx_payment_settings_brand ON payment_settings(user_id, business_name);
