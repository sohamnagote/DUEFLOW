import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { config } from './config';
import { deriveOperationalStatus, areRemindersExecutable } from './services/statusService';
import { calculateReminderRules, recomputeRulesForUnpaid } from './services/schedulerService';

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  phone?: string;
  timezone: string;
  upi_id?: string;
  bank_account?: string;
  bank_ifsc?: string;
  reminder_default: string;
  default_reminder_channel?: 'email' | 'whatsapp' | 'both';
  email_reminders_enabled?: boolean;
  whatsapp_reminders_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  notes?: string;
  cin?: string;
  phone?: string;
  attn?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  user_id: string;
  client_id?: string | null;
  client_name_snapshot: string;
  client_email_snapshot: string;
  client_phone_snapshot?: string | null;
  invoice_number: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  status: 'unpaid' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';
  reminders_enabled: boolean;
  reminder_channel?: 'default' | 'email' | 'whatsapp' | 'both';
  template_key: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderRuleRecord {
  id: string;
  invoice_id: string;
  channel: 'email' | 'whatsapp';
  offset_days: number;
  direction: 'before' | 'on' | 'after';
  enabled: boolean;
  occurrence_key: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'sent' | 'skipped' | 'cancelled' | 'failed';
  created_at: string;
}

export interface ReminderLogRecord {
  id: string;
  invoice_id: string;
  rule_id?: string | null;
  channel?: 'email' | 'whatsapp';
  provider?: string;
  occurrence_key: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient?: string;
  subject?: string | null;
  provider_message_id?: string | null;
  status: 'delivered' | 'sent' | 'bounced' | 'complained' | 'failed';
  error_code?: string | null;
  retryable?: boolean;
  attempted_at: string;
  sent_at?: string | null;
  created_at: string;
}

export interface IntegrationRecord {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft' | 'resend' | 'whatsapp_business';
  channel: 'email' | 'whatsapp';
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED';
  provider_account_id?: string | null;
  provider_email?: string | null;
  provider_business_id?: string | null;
  provider_phone_id?: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  connected_at?: string | null;
  updated_at: string;
  last_success_at?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  created_at: string;
}

export interface SafeIntegration {
  id?: string;
  provider: 'google' | 'microsoft' | 'resend' | 'whatsapp_business';
  channel: 'email' | 'whatsapp';
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED';
  display_email?: string;
  display_name?: string;
  display_phone?: string;
  business_name?: string;
  connected_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
}

export interface AiActionRecord {
  id: string;
  user_id: string;
  invoice_id?: string | null;
  action_type: string;
  prompt_summary?: string;
  model_used: string;
  generated_subject?: string;
  generated_body?: string;
  tokens_used?: number;
  latency_ms?: number;
  is_fallback: boolean;
  created_at: string;
}

// In-memory persistent database engine for complete transactional integrity
class MemoryStore {
  profiles = new Map<string, ProfileRecord>();
  clients = new Map<string, ClientRecord>();
  invoices = new Map<string, InvoiceRecord>();
  reminderRules = new Map<string, ReminderRuleRecord>();
  reminderLogs = new Map<string, ReminderLogRecord>();
  integrations = new Map<string, IntegrationRecord>();
  aiActions = new Map<string, AiActionRecord>();
}

const memoryDb = new MemoryStore();

// Supabase client instance if configured
let supabaseAdmin: SupabaseClient | null = null;
const isSupabaseConfigured = Boolean(
  config.SUPABASE_URL && 
  config.SUPABASE_URL.startsWith('http') && 
  config.SUPABASE_SECRET_KEY
);

if (isSupabaseConfigured) {
  try {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn('Could not initialize Supabase admin client:', err);
  }
}

export const db = {
  isCloudConnected(): boolean {
    return isSupabaseConfigured && !!supabaseAdmin;
  },

  // ---------------------------------------------------------------------------
  // PROFILES
  // ---------------------------------------------------------------------------
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) return data;
    }
    return memoryDb.profiles.get(userId) || null;
  },

  async upsertProfile(profile: Partial<ProfileRecord> & { id: string; email: string }): Promise<ProfileRecord> {
    const now = new Date().toISOString();
    const existing = await this.getProfile(profile.id);

    const record: ProfileRecord = {
      id: profile.id,
      email: profile.email.toLowerCase().trim(),
      full_name: profile.full_name ?? existing?.full_name ?? '',
      business_name: profile.business_name ?? existing?.business_name ?? '',
      phone: profile.phone ?? existing?.phone ?? '',
      timezone: profile.timezone ?? existing?.timezone ?? 'Asia/Kolkata',
      upi_id: profile.upi_id ?? existing?.upi_id ?? '',
      bank_account: profile.bank_account ?? existing?.bank_account ?? '',
      bank_ifsc: profile.bank_ifsc ?? existing?.bank_ifsc ?? '',
      reminder_default: profile.reminder_default ?? existing?.reminder_default ?? 'cadence_default',
      default_reminder_channel: profile.default_reminder_channel ?? existing?.default_reminder_channel ?? 'email',
      email_reminders_enabled: profile.email_reminders_enabled ?? existing?.email_reminders_enabled ?? true,
      whatsapp_reminders_enabled: profile.whatsapp_reminders_enabled ?? existing?.whatsapp_reminders_enabled ?? false,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('profiles').upsert(record);
    }
    memoryDb.profiles.set(record.id, record);
    return record;
  },

  async findProfileByEmail(email: string): Promise<ProfileRecord | null> {
    const normalized = email.toLowerCase().trim();
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', normalized).maybeSingle();
      if (data) return data;
    }
    for (const p of memoryDb.profiles.values()) {
      if (p.email.toLowerCase() === normalized) return p;
    }
    return null;
  },

  async updateRuleStatus(ruleId: string, status: ReminderRuleRecord['status']): Promise<void> {
    const r = memoryDb.reminderRules.get(ruleId);
    if (r) r.status = status;
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('reminder_rules').update({ status }).eq('id', ruleId);
    }
  },

  // ---------------------------------------------------------------------------
  // CLIENTS
  // ---------------------------------------------------------------------------
  async listClients(userId: string): Promise<ClientRecord[]> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return Array.from(memoryDb.clients.values())
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getClient(userId: string, clientId: string): Promise<ClientRecord | null> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('id', clientId)
        .maybeSingle();
      if (!error && data) return data;
    }
    const c = memoryDb.clients.get(clientId);
    if (c && c.user_id === userId) return c;
    return null;
  },

  async createClient(userId: string, data: { name: string; email: string; notes?: string; cin?: string; phone?: string; attn?: string }): Promise<ClientRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record: ClientRecord = {
      id,
      user_id: userId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      notes: data.notes?.trim() || '',
      cin: data.cin?.trim() || '',
      phone: data.phone?.trim() || '',
      attn: data.attn?.trim() || '',
      created_at: now,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: created, error } = await supabaseAdmin.from('clients').insert(record).select().single();
      if (!error && created) return created;
    }
    memoryDb.clients.set(id, record);
    return record;
  },

  async updateClient(userId: string, clientId: string, data: Partial<ClientRecord>): Promise<ClientRecord | null> {
    const existing = await this.getClient(userId, clientId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: ClientRecord = {
      ...existing,
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : existing.email,
      name: data.name ? data.name.trim() : existing.name,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('clients').update(updated).eq('id', clientId).eq('user_id', userId);
    }
    memoryDb.clients.set(clientId, updated);
    return updated;
  },

  async deleteClient(userId: string, clientId: string): Promise<boolean> {
    const existing = await this.getClient(userId, clientId);
    if (!existing) return false;

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('clients').delete().eq('id', clientId).eq('user_id', userId);
    }
    memoryDb.clients.delete(clientId);
    return true;
  },

  // ---------------------------------------------------------------------------
  // INVOICES
  // ---------------------------------------------------------------------------
  async listInvoices(
    userId: string,
    options: {
      search?: string;
      status?: string;
      sort?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ invoices: (InvoiceRecord & { operational_status: string })[]; total: number }> {
    let list: InvoiceRecord[] = [];

    if (this.isCloudConnected() && supabaseAdmin) {
      let query = supabaseAdmin.from('invoices').select('*').eq('user_id', userId);
      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }
      const { data } = await query;
      if (data) list = data;
    } else {
      list = Array.from(memoryDb.invoices.values()).filter((inv) => inv.user_id === userId);
    }

    // Calculate operational status
    const withOpStatus = list.map((inv) => ({
      ...inv,
      operational_status: deriveOperationalStatus(inv),
    }));

    // Filter by search query
    let filtered = withOpStatus;
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.client_name_snapshot.toLowerCase().includes(q) ||
          inv.client_email_snapshot.toLowerCase().includes(q)
      );
    }

    // Filter by operational status if requested
    if (options.status && options.status !== 'all') {
      filtered = filtered.filter((inv) => inv.operational_status === options.status || inv.status === options.status);
    }

    // Sort
    filtered.sort((a, b) => {
      if (options.sort === 'amount_desc') return b.amount - a.amount;
      if (options.sort === 'amount_asc') return a.amount - b.amount;
      if (options.sort === 'due_date_asc') return a.due_date.localeCompare(b.due_date);
      if (options.sort === 'due_date_desc') return b.due_date.localeCompare(a.due_date);
      return b.created_at.localeCompare(a.created_at); // default newest
    });

    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return { invoices: paginated, total: filtered.length };
  },

  async getInvoice(userId: string, invoiceId: string): Promise<(InvoiceRecord & { operational_status: string }) | null> {
    let inv: InvoiceRecord | null = null;
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('invoices').select('*').eq('user_id', userId).eq('id', invoiceId).maybeSingle();
      if (data) inv = data;
    } else {
      const found = memoryDb.invoices.get(invoiceId);
      if (found && found.user_id === userId) inv = found;
    }

    if (!inv) return null;
    return {
      ...inv,
      operational_status: deriveOperationalStatus(inv),
    };
  },

  async createInvoice(
    userId: string,
    data: {
      client_id?: string | null;
      client_name: string;
      client_email: string;
      invoice_number: string;
      amount: number;
      currency?: string;
      issue_date: string;
      due_date: string;
      notes?: string;
      template_key?: string;
      reminders_enabled?: boolean;
    }
  ): Promise<InvoiceRecord & { operational_status: string; rules: ReminderRuleRecord[] }> {
    // Enforce uniqueness constraint on (user_id, invoice_number)
    const existingInvoices = Array.from(memoryDb.invoices.values()).filter(
      (i) => i.user_id === userId && i.invoice_number.trim().toLowerCase() === data.invoice_number.trim().toLowerCase()
    );
    if (existingInvoices.length > 0) {
      const err = new Error(`Invoice number "${data.invoice_number}" already exists for this account.`);
      (err as any).code = '23505';
      throw err;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const normalizedEmail = data.client_email.toLowerCase().trim();

    // Fetch user profile for timezone
    const profile = await this.getProfile(userId);
    const timezone = profile?.timezone || 'Asia/Kolkata';

    const invoiceRecord: InvoiceRecord = {
      id,
      user_id: userId,
      client_id: data.client_id || null,
      client_name_snapshot: data.client_name.trim(),
      client_email_snapshot: normalizedEmail,
      invoice_number: data.invoice_number.trim(),
      amount: Math.round(Number(data.amount) * 100) / 100, // 2 decimal precision
      currency: data.currency || 'INR',
      issue_date: data.issue_date,
      due_date: data.due_date,
      notes: data.notes?.trim() || '',
      status: 'unpaid',
      reminders_enabled: data.reminders_enabled ?? true,
      reminder_channel: (data as any).reminder_channel || 'default',
      client_phone_snapshot: (data as any).client_phone?.trim() || null,
      template_key: data.template_key || 'cadence_default',
      paid_at: null,
      created_at: now,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').insert(invoiceRecord);
    }
    memoryDb.invoices.set(id, invoiceRecord);

    const channelPreference = (data as any).reminder_channel === 'default' || !(data as any).reminder_channel
      ? profile?.default_reminder_channel || 'email'
      : (data as any).reminder_channel;

    let targetChannels: ('email' | 'whatsapp')[] = ['email'];
    if (channelPreference === 'both') {
      targetChannels = ['email', 'whatsapp'];
    } else if (channelPreference === 'whatsapp') {
      targetChannels = ['whatsapp'];
    }

    // Deterministically generate reminder rules for target channels
    const generatedRules = calculateReminderRules(data.due_date, timezone, 'unpaid', targetChannels);
    const ruleRecords: ReminderRuleRecord[] = generatedRules.map((r) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      channel: r.channel,
      offset_days: r.offset_days,
      direction: r.direction,
      enabled: invoiceRecord.reminders_enabled,
      occurrence_key: r.occurrence_key,
      scheduled_for: r.scheduled_for,
      status: r.status,
      created_at: now,
    }));

    for (const rule of ruleRecords) {
      if (this.isCloudConnected() && supabaseAdmin) {
        await supabaseAdmin.from('reminder_rules').insert(rule);
      }
      memoryDb.reminderRules.set(rule.id, rule);
    }

    return {
      ...invoiceRecord,
      operational_status: deriveOperationalStatus(invoiceRecord),
      rules: ruleRecords,
    };
  },

  async updateInvoice(
    userId: string,
    invoiceId: string,
    data: Partial<InvoiceRecord>
  ): Promise<(InvoiceRecord & { operational_status: string }) | null> {
    const existing = await this.getInvoice(userId, invoiceId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: InvoiceRecord = {
      ...existing,
      ...data,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').update(updated).eq('id', invoiceId).eq('user_id', userId);
    }
    memoryDb.invoices.set(invoiceId, updated);

    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated),
    };
  },

  async deleteInvoice(userId: string, invoiceId: string): Promise<boolean> {
    const existing = await this.getInvoice(userId, invoiceId);
    if (!existing) return false;

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').delete().eq('id', invoiceId).eq('user_id', userId);
    }
    memoryDb.invoices.delete(invoiceId);

    // Cascade delete rules & logs in memory
    for (const [rId, rule] of memoryDb.reminderRules.entries()) {
      if (rule.invoice_id === invoiceId) memoryDb.reminderRules.delete(rId);
    }
    for (const [lId, log] of memoryDb.reminderLogs.entries()) {
      if (log.invoice_id === invoiceId) memoryDb.reminderLogs.delete(lId);
    }
    return true;
  },

  async markInvoicePaid(userId: string, invoiceId: string): Promise<InvoiceRecord & { operational_status: string }> {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const updated: InvoiceRecord = {
      ...inv,
      status: 'paid',
      paid_at: now,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').update(updated).eq('id', invoiceId).eq('user_id', userId);
    }
    memoryDb.invoices.set(invoiceId, updated);

    // Cancel all future pending reminder rules
    for (const rule of memoryDb.reminderRules.values()) {
      if (rule.invoice_id === invoiceId && rule.status === 'pending') {
        rule.status = 'cancelled';
        rule.enabled = false;
        if (this.isCloudConnected() && supabaseAdmin) {
          await supabaseAdmin.from('reminder_rules').update({ status: 'cancelled', enabled: false }).eq('id', rule.id);
        }
      }
    }

    return {
      ...updated,
      operational_status: 'paid',
    };
  },

  async markInvoiceUnpaid(userId: string, invoiceId: string): Promise<InvoiceRecord & { operational_status: string; rules: ReminderRuleRecord[] }> {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const updated: InvoiceRecord = {
      ...inv,
      status: 'unpaid',
      paid_at: null,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').update(updated).eq('id', invoiceId).eq('user_id', userId);
    }
    memoryDb.invoices.set(invoiceId, updated);

    // Fetch previously sent occurrence keys so we never re-send already dispatched stages!
    const existingLogs = Array.from(memoryDb.reminderLogs.values()).filter(
      (l) => l.invoice_id === invoiceId && (l.status === 'sent' || l.status === 'delivered')
    );
    const sentOccurrenceKeys = new Set<string>(existingLogs.map((l) => l.occurrence_key));

    const profile = await this.getProfile(userId);
    const timezone = profile?.timezone || 'Asia/Kolkata';

    const channelPreference = inv.reminder_channel === 'default' || !inv.reminder_channel
      ? profile?.default_reminder_channel || 'email'
      : inv.reminder_channel;

    let targetChannels: ('email' | 'whatsapp')[] = ['email'];
    if (channelPreference === 'both') {
      targetChannels = ['email', 'whatsapp'];
    } else if (channelPreference === 'whatsapp') {
      targetChannels = ['whatsapp'];
    }

    // Recompute future pending rules
    const recomputed = recomputeRulesForUnpaid(inv.due_date, sentOccurrenceKeys, timezone, targetChannels);

    // Update rules in store
    const currentRules = Array.from(memoryDb.reminderRules.values()).filter((r) => r.invoice_id === invoiceId);
    const resultRules: ReminderRuleRecord[] = [];

    for (const recomputedRule of recomputed) {
      const match = currentRules.find(
        (r) => r.occurrence_key === recomputedRule.occurrence_key && r.channel === recomputedRule.channel
      );
      if (match) {
        match.status = recomputedRule.status;
        match.enabled = recomputedRule.enabled;
        match.scheduled_for = recomputedRule.scheduled_for;
        if (this.isCloudConnected() && supabaseAdmin) {
          await supabaseAdmin.from('reminder_rules').update(match).eq('id', match.id);
        }
        resultRules.push(match);
      } else {
        const newRecord: ReminderRuleRecord = {
          id: crypto.randomUUID(),
          invoice_id: invoiceId,
          channel: recomputedRule.channel,
          offset_days: recomputedRule.offset_days,
          direction: recomputedRule.direction,
          enabled: recomputedRule.enabled,
          occurrence_key: recomputedRule.occurrence_key,
          scheduled_for: recomputedRule.scheduled_for,
          status: recomputedRule.status,
          created_at: now,
        };
        memoryDb.reminderRules.set(newRecord.id, newRecord);
        if (this.isCloudConnected() && supabaseAdmin) {
          await supabaseAdmin.from('reminder_rules').insert(newRecord);
        }
        resultRules.push(newRecord);
      }
    }

    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated),
      rules: resultRules,
    };
  },

  async toggleReminders(userId: string, invoiceId: string, enabled: boolean): Promise<InvoiceRecord & { operational_status: string }> {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const updated: InvoiceRecord = {
      ...inv,
      reminders_enabled: enabled,
      updated_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('invoices').update({ reminders_enabled: enabled }).eq('id', invoiceId).eq('user_id', userId);
    }
    memoryDb.invoices.set(invoiceId, updated);

    // Update rules
    for (const rule of memoryDb.reminderRules.values()) {
      if (rule.invoice_id === invoiceId && rule.status === 'pending') {
        rule.enabled = enabled;
      }
    }

    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated),
    };
  },

  // ---------------------------------------------------------------------------
  // REMINDER RULES & LOGS
  // ---------------------------------------------------------------------------
  async getRulesForInvoice(invoiceId: string): Promise<ReminderRuleRecord[]> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('reminder_rules').select('*').eq('invoice_id', invoiceId).order('scheduled_for', { ascending: true });
      if (data) return data;
    }
    return Array.from(memoryDb.reminderRules.values())
      .filter((r) => r.invoice_id === invoiceId)
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  },

  async getLogsForInvoice(invoiceId: string): Promise<ReminderLogRecord[]> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('reminder_logs').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false });
      if (data) return data;
    }
    return Array.from(memoryDb.reminderLogs.values())
      .filter((l) => l.invoice_id === invoiceId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async recordLog(log: Omit<ReminderLogRecord, 'id' | 'created_at'>): Promise<ReminderLogRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: ReminderLogRecord = {
      ...log,
      id,
      channel: log.channel || 'email',
      provider: log.provider || 'system',
      recipient: log.recipient || log.recipient_email || log.recipient_phone || 'recipient',
      created_at: now,
    };

    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('reminder_logs').insert(record);
    }
    memoryDb.reminderLogs.set(id, record);
    return record;
  },

  async updateLogDelivery(
    providerMessageId: string,
    status: 'delivered' | 'bounced' | 'complained' | 'failed',
    errorCode?: string
  ): Promise<boolean> {
    for (const log of memoryDb.reminderLogs.values()) {
      if (log.provider_message_id === providerMessageId) {
        log.status = status;
        if (errorCode) log.error_code = errorCode;
      }
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin
        .from('reminder_logs')
        .update({ status, error_code: errorCode || null })
        .eq('provider_message_id', providerMessageId);
    }
    return true;
  },

  // ---------------------------------------------------------------------------
  // INTEGRATIONS (OAUTH & WHATSAPP BUSINESS)
  // ---------------------------------------------------------------------------
  async getIntegrations(userId: string): Promise<IntegrationRecord[]> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('integrations').select('*').eq('user_id', userId);
      if (data) return data;
    }
    return Array.from(memoryDb.integrations.values()).filter((i) => i.user_id === userId);
  },

  async getIntegrationByProvider(userId: string, provider: string): Promise<IntegrationRecord | null> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();
      if (data) return data;
    }
    for (const i of memoryDb.integrations.values()) {
      if (i.user_id === userId && i.provider === provider) return i;
    }
    return null;
  },

  async getIntegrationByChannel(userId: string, channel: 'email' | 'whatsapp'): Promise<IntegrationRecord | null> {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('channel', channel)
        .eq('status', 'CONNECTED')
        .maybeSingle();
      if (data) return data;
    }
    for (const i of memoryDb.integrations.values()) {
      if (i.user_id === userId && i.channel === channel && i.status === 'CONNECTED') return i;
    }
    return null;
  },

  async upsertIntegration(integration: IntegrationRecord): Promise<IntegrationRecord> {
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('integrations').upsert(integration);
    }
    memoryDb.integrations.set(integration.id, integration);
    return integration;
  },

  async updateIntegrationTokens(id: string, updates: Partial<IntegrationRecord>): Promise<void> {
    const item = memoryDb.integrations.get(id);
    if (item) {
      Object.assign(item, updates, { updated_at: new Date().toISOString() });
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin
        .from('integrations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  },

  async updateIntegrationStatus(
    id: string,
    status: IntegrationRecord['status'],
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const item = memoryDb.integrations.get(id);
    if (item) {
      item.status = status;
      if (errorCode !== undefined) item.last_error_code = errorCode;
      if (errorMessage !== undefined) item.last_error_message = errorMessage;
      item.updated_at = new Date().toISOString();
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin
        .from('integrations')
        .update({
          status,
          last_error_code: errorCode || null,
          last_error_message: errorMessage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  },

  async recordIntegrationSuccess(id: string): Promise<void> {
    const now = new Date().toISOString();
    const item = memoryDb.integrations.get(id);
    if (item) {
      item.last_success_at = now;
      item.last_error_code = null;
      item.last_error_message = null;
      item.updated_at = now;
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin
        .from('integrations')
        .update({
          last_success_at: now,
          last_error_code: null,
          last_error_message: null,
          updated_at: now,
        })
        .eq('id', id);
    }
  },

  async deleteIntegration(userId: string, provider: string): Promise<boolean> {
    for (const [id, i] of memoryDb.integrations.entries()) {
      if (i.user_id === userId && i.provider === provider) {
        memoryDb.integrations.delete(id);
      }
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('integrations').delete().eq('user_id', userId).eq('provider', provider);
    }
    return true;
  },

  toSafeIntegration(rec: IntegrationRecord): SafeIntegration {
    return {
      id: rec.id,
      provider: rec.provider,
      channel: rec.channel,
      status: rec.status,
      display_email: rec.provider_email || undefined,
      display_name: rec.provider_account_id || rec.provider_business_id || undefined,
      display_phone: rec.provider_phone_id || undefined,
      business_name: rec.provider_business_id || undefined,
      connected_at: rec.connected_at,
      last_success_at: rec.last_success_at,
      last_error: rec.last_error_message || rec.last_error_code || undefined,
    };
  },

  async getDuePendingRules(nowIso: string): Promise<{ rule: ReminderRuleRecord; invoice: InvoiceRecord; profile: ProfileRecord }[]> {
    const results: { rule: ReminderRuleRecord; invoice: InvoiceRecord; profile: ProfileRecord }[] = [];

    const allRules = Array.from(memoryDb.reminderRules.values());
    for (const rule of allRules) {
      if (rule.status === 'pending' && rule.enabled && rule.scheduled_for <= nowIso) {
        const invoice = memoryDb.invoices.get(rule.invoice_id);
        if (invoice && invoice.reminders_enabled && invoice.status !== 'paid' && invoice.status !== 'cancelled') {
          const profile = (await this.getProfile(invoice.user_id)) || {
            id: invoice.user_id,
            email: 'user@dueflow.in',
            full_name: 'Freelancer',
            business_name: 'Agency',
            timezone: 'Asia/Kolkata',
            reminder_default: 'cadence_default',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          results.push({ rule, invoice, profile });
        }
      }
    }

    return results;
  },

  // ---------------------------------------------------------------------------
  // AI ACTIONS AUDIT
  // ---------------------------------------------------------------------------
  async logAiAction(action: Omit<AiActionRecord, 'id' | 'created_at'>): Promise<AiActionRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: AiActionRecord = {
      ...action,
      id,
      created_at: now,
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      await supabaseAdmin.from('ai_actions').insert(record);
    }
    memoryDb.aiActions.set(id, record);
    return record;
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD AGGREGATES
  // ---------------------------------------------------------------------------
  async getDashboardAggregates(userId: string) {
    const { invoices } = await this.listInvoices(userId);

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let activeCadenceCount = 0;

    for (const inv of invoices) {
      const op = inv.operational_status;
      if (op === 'paid') {
        totalPaid += inv.amount;
      } else {
        totalOutstanding += inv.amount;
        if (op === 'overdue') {
          totalOverdue += inv.amount;
          overdueCount++;
        }
        if (inv.reminders_enabled) {
          activeCadenceCount++;
        }
      }
    }

    // Recent logs
    const userInvoices = new Set(invoices.map((i) => i.id));
    const recentLogs = Array.from(memoryDb.reminderLogs.values())
      .filter((l) => userInvoices.has(l.invoice_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    return {
      totalOutstanding,
      totalOverdue,
      totalPaid,
      totalInvoices: invoices.length,
      overdueCount,
      activeCadenceCount,
      recentLogs,
    };
  },
};
