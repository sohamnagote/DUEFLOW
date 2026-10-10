-- ==============================================================================
-- DueFlow PostgreSQL Schema Migration (V1__init_schema.sql)
-- Complete tenant-isolated tables with Flyway versioning
-- ==============================================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    preferred_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    automated_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 2. Payment Settings
CREATE TABLE IF NOT EXISTS payment_settings (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    upi_id VARCHAR(255),
    beneficiary_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    routing_number VARCHAR(100),
    payment_instructions TEXT,
    qr_code_url TEXT,
    qr_code_storage_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_settings_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_settings_user ON payment_settings(user_id);

-- 3. Clients
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    billing_address TEXT,
    tax_identifier VARCHAR(100),
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_email ON clients(user_id, email);

-- 4. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    description TEXT,
    notes TEXT,
    payment_instructions TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    reminders_sent_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    CONSTRAINT uq_invoices_user_number UNIQUE (user_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

-- 5. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.000,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 6. Reminder Rules
CREATE TABLE IF NOT EXISTS reminder_rules (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    timing VARCHAR(30) NOT NULL, -- BEFORE, ON_DUE_DATE, AFTER
    days_offset INT NOT NULL DEFAULT 0,
    send_time VARCHAR(10) NOT NULL DEFAULT '09:00',
    tone VARCHAR(30) NOT NULL DEFAULT 'FRIENDLY', -- FRIENDLY, PROFESSIONAL, FIRM
    custom_subject VARCHAR(255),
    custom_message TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reminder_rules_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_user_id ON reminder_rules(user_id);

-- 7. Gmail Integrations
CREATE TABLE IF NOT EXISTS gmail_integrations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    gmail_email VARCHAR(255) NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE,
    granted_scopes TEXT,
    connection_status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED', -- CONNECTED, DISCONNECTED, ERROR
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gmail_integrations_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gmail_integrations_user ON gmail_integrations(user_id);

-- 8. Scheduled Reminders (Durable background queue with unique idempotency keys)
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    rule_id VARCHAR(64),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED, CANCELLED
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scheduled_reminders_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_reminders_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_reminders_rule FOREIGN KEY (rule_id) REFERENCES reminder_rules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sched_reminders_status_time ON scheduled_reminders(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sched_reminders_invoice ON scheduled_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sched_reminders_user ON scheduled_reminders(user_id);

-- 9. Reminder Delivery History
CREATE TABLE IF NOT EXISTS reminder_history (
    id VARCHAR(64) PRIMARY KEY,
    scheduled_reminder_id VARCHAR(64),
    invoice_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL, -- SENT, FAILED
    provider_message_id VARCHAR(255),
    error_category VARCHAR(100),
    error_message TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reminder_history_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_history_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminder_history_user ON reminder_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_invoice ON reminder_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_attempted ON reminder_history(attempted_at);

-- 10. Application Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- OVERDUE, DUE_SOON, REMINDER, ERROR, SYSTEM
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
