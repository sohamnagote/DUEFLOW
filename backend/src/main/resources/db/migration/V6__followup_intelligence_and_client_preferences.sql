-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V6__followup_intelligence_and_client_preferences.sql)
-- Follow-up intelligence, client response portal, and communication preferences
-- ==============================================================================

-- 1. Client communication preferences
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS reminder_tone VARCHAR(30) DEFAULT 'PROFESSIONAL',
    ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(30) DEFAULT 'EMAIL',
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS allowed_days VARCHAR(255) DEFAULT 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    ADD COLUMN IF NOT EXISTS communication_window_start VARCHAR(10) DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS communication_window_end VARCHAR(10) DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(10) DEFAULT '21:00',
    ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(10) DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS automated_reminders_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS communication_notes TEXT;

-- 2. Invoice reply-aware follow-up status & response token
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS follow_up_status VARCHAR(50) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS last_reply_snippet TEXT,
    ADD COLUMN IF NOT EXISTS last_reply_classification VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS gmail_thread_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS response_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS response_token_expiry TIMESTAMP WITH TIME ZONE;

-- 3. Reminder history thread tracking
ALTER TABLE reminder_history
    ADD COLUMN IF NOT EXISTS provider_thread_id VARCHAR(255);

-- 4. Gmail synchronization checkpoints
ALTER TABLE gmail_integrations
    ADD COLUMN IF NOT EXISTS last_history_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- 5. One-click client responses table
CREATE TABLE IF NOT EXISTS client_responses (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
    response_type VARCHAR(50) NOT NULL,
    response_text TEXT,
    proposed_payment_date DATE,
    review_status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
    client_email VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Processed Gmail messages (prevents duplicate reply processing)
CREATE TABLE IF NOT EXISTS processed_gmail_messages (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
    gmail_thread_id VARCHAR(255),
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
    sender_email VARCHAR(255),
    subject TEXT,
    snippet TEXT,
    classification VARCHAR(100),
    action_taken VARCHAR(100),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Indexes for performance and lookup safety
CREATE INDEX IF NOT EXISTS idx_invoices_response_token ON invoices(response_token);
CREATE INDEX IF NOT EXISTS idx_invoices_gmail_thread ON invoices(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_client_responses_invoice ON client_responses(invoice_id, user_id);
CREATE INDEX IF NOT EXISTS idx_processed_gmail_messages_user ON processed_gmail_messages(user_id, gmail_thread_id);
