export type InvoiceStatus = 'due_soon' | 'overdue' | 'paid' | 'scheduled';

export type ToneTemplate = 
  | 'Gentle Creative Professional'
  | 'Casual Friendly'
  | 'Firm & Direct';

export type CadenceStage = 1 | 2 | 3 | 4;

export type DispatchChannel = 'email' | 'whatsapp' | 'both';

export interface ReminderRule {
  id: string;
  invoice_id: string;
  stage_number: CadenceStage;
  stage_label: string; // e.g. "Stage 01 · 3 Days Before"
  offset_days: number; // -3, 0, 3, 7
  subject_line: string;
  scheduled_for: string; // "Oct 23, 2024 · 10:00 AM"
  status: 'delivered' | 'sent' | 'scheduled' | 'pending' | 'processing' | 'sending' | 'failed' | 'cancelled' | 'skipped';
  channel?: DispatchChannel;
  delivered_at?: string;
  error_message?: string;
}

export interface ReminderLog {
  id: string;
  invoice_id: string;
  invoice_number: string;
  recipient_email: string;
  recipient_phone?: string;
  stage_name: string;
  status: 'sent' | 'failed' | 'bounced' | 'cancelled';
  channel?: DispatchChannel;
  timestamp: string;
  provider_message_id: string;
  details?: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string; // "#INV-1042"
  client_id: string;
  client_name: string;
  client_email: string;
  client_cin?: string;
  client_attn?: string;
  client_phone?: string;
  amount: number; // INR
  currency: 'INR';
  issue_date: string; // "2024-10-12"
  issue_time_formatted?: string; // "Dispatched 11:42 AM IST"
  due_date: string; // "2024-10-26"
  due_term_label?: string; // "Net 14 payment term"
  status: InvoiceStatus;
  reminders_enabled: boolean;
  tone_template: ToneTemplate;
  cadence_architecture: string; // "Active · 4-Step MVP Cadence"
  notes: string;
  paid_at?: string;
  created_at: string;
  rules: ReminderRule[];
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  cin?: string;
  attn?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  invoice_id?: string;
  invoice_number: string;
  action_type: 'reminder_sent' | 'marked_paid' | 'reminder_failed' | 'nudge_sent' | 'invoice_created' | 'reminders_toggled';
  message: string; // e.g. "Reminder sent"
  time_ago: string; // "2H AGO"
  timestamp: string;
  status_tone: 'neutral' | 'success' | 'error' | 'secondary';
}

export interface ChannelIntegration {
  enabled: boolean;
  connected: boolean;
  account_identifier?: string;
  sender_phone?: string;
  provider?: string;
}

export type IntegrationStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED';

export interface SafeIntegration {
  id?: string;
  provider: 'google' | 'microsoft' | 'resend' | 'whatsapp_business';
  channel: 'email' | 'whatsapp';
  status: IntegrationStatus;
  display_email?: string;
  display_name?: string;
  display_phone?: string;
  business_name?: string;
  connected_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
}

export interface IntegrationSettingsResponse {
  default_reminder_channel: 'email' | 'whatsapp' | 'both';
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  can_select_both: boolean;
  email_connected: boolean;
  whatsapp_connected: boolean;
}

export interface IntegrationsConfig {
  email: {
    enabled: boolean;
    connected: boolean;
    provider: 'dueflow_mailer' | 'custom_smtp' | 'resend';
    sender_name: string;
    sender_email: string;
  };
  whatsapp: {
    enabled: boolean;
    connected: boolean;
    sender_phone: string;
    mode: 'direct_web' | 'business_cloud';
    default_template: 'polite' | 'standard' | 'firm';
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  phone?: string;
  timezone: string;
  upi_id?: string;
  bank_account_no?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  bank_account_name?: string;
  address?: string;
  logo_url?: string;
  payment_notes?: string;
  payment_qr_url?: string;
  default_tone?: ToneTemplate;
  reminder_default?: string;
  default_reminder_channel?: 'email' | 'whatsapp' | 'both';
  email_reminders_enabled?: boolean;
  whatsapp_reminders_enabled?: boolean;
  integrations?: IntegrationsConfig;
}
