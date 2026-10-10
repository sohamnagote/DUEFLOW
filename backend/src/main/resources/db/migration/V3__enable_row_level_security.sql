-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V3__enable_row_level_security.sql)
-- Enable Row Level Security (RLS) on all user-owned tables
-- Defense-in-depth isolation for Supabase PostgreSQL
-- ==============================================================================

-- 1. User Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_owner_policy ON user_profiles;
CREATE POLICY user_profiles_owner_policy ON user_profiles
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 2. Payment Settings
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_settings_owner_policy ON payment_settings;
CREATE POLICY payment_settings_owner_policy ON payment_settings
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 3. Clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_owner_policy ON clients;
CREATE POLICY clients_owner_policy ON clients
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 4. Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_owner_policy ON invoices;
CREATE POLICY invoices_owner_policy ON invoices
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 5. Invoice Items (Scoped to owning user's invoice)
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_items_owner_policy ON invoice_items;
CREATE POLICY invoice_items_owner_policy ON invoice_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()::text
        )
    );

-- 6. Reminder Rules
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reminder_rules_owner_policy ON reminder_rules;
CREATE POLICY reminder_rules_owner_policy ON reminder_rules
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 7. Gmail Integrations
ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gmail_integrations_owner_policy ON gmail_integrations;
CREATE POLICY gmail_integrations_owner_policy ON gmail_integrations
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 8. Scheduled Reminders
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_reminders_owner_policy ON scheduled_reminders;
CREATE POLICY scheduled_reminders_owner_policy ON scheduled_reminders
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 9. Reminder History
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reminder_history_owner_policy ON reminder_history;
CREATE POLICY reminder_history_owner_policy ON reminder_history
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 10. Application Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_owner_policy ON notifications;
CREATE POLICY notifications_owner_policy ON notifications
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Ensure service_role has bypass or full permission for background scheduler tasks
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
