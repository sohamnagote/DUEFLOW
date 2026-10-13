-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V4__add_onboarding_completed.sql)
-- Add onboarding_completed field to user_profiles for reliable persistent onboarding state
-- ==============================================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure all existing active user profiles with full_name populated are marked completed
UPDATE user_profiles
SET onboarding_completed = TRUE
WHERE full_name IS NOT NULL AND TRIM(full_name) != '';
