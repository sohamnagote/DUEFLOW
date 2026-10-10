-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V2__custom_reminder_rule_fields.sql)
-- Add timezone and optional invoice_id to reminder_rules table
-- ==============================================================================

ALTER TABLE reminder_rules
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reminder_rules_invoice'
    ) THEN
        ALTER TABLE reminder_rules
            ADD CONSTRAINT fk_reminder_rules_invoice
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reminder_rules_invoice_id ON reminder_rules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_user_timing ON reminder_rules(user_id, timing, enabled);
