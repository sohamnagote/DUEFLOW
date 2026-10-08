import { Invoice, Client, UserProfile, ReminderLog, ReminderRule, SafeIntegration, IntegrationSettingsResponse } from '../types';

const TOKEN_KEY = 'dueflow_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Request helper attaching Bearer authorization
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || (data.details ? data.details[0]?.message : 'Request failed');
    const err = new Error(errorMsg);
    (err as any).code = data.code;
    throw err;
  }

  return data as T;
}

export const api = {
  // ---------------------------------------------------------------------------
  // AUTH & PROFILE
  // ---------------------------------------------------------------------------
  async signup(data: { email: string; password: string; full_name?: string; business_name?: string }) {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return apiFetch<{ user: UserProfile }>('/api/auth/me');
  },

  async logout() {
    clearStoredToken();
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
  },

  async getProfile() {
    return apiFetch<{ profile: UserProfile }>('/api/profile');
  },

  async updateProfile(profile: Partial<UserProfile>) {
    return apiFetch<{ profile: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------
  async getDashboard() {
    return apiFetch<{
      totalOutstanding: number;
      totalOverdue: number;
      totalPaid: number;
      totalInvoices: number;
      overdueCount: number;
      activeCadenceCount: number;
      recentLogs: any[];
    }>('/api/dashboard');
  },

  // ---------------------------------------------------------------------------
  // INVOICES
  // ---------------------------------------------------------------------------
  async listInvoices(params: { search?: string; status?: string; sort?: string; page?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));

    const url = `/api/invoices${qs.toString() ? `?${qs.toString()}` : ''}`;
    return apiFetch<{ invoices: (Invoice & { operational_status: string })[]; total: number }>(url);
  },

  async getInvoice(id: string) {
    return apiFetch<{
      invoice: Invoice & { operational_status: string };
      rules: ReminderRule[];
      logs: ReminderLog[];
    }>(`/api/invoices/${id}`);
  },

  async createInvoice(data: {
    client_name: string;
    client_email: string;
    client_id?: string;
    invoice_number: string;
    amount: number;
    issue_date: string;
    due_date: string;
    notes?: string;
    template_key?: string;
    reminders_enabled?: boolean;
  }) {
    return apiFetch<Invoice & { rules: ReminderRule[] }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInvoice(id: string, data: Partial<Invoice>) {
    return apiFetch<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteInvoice(id: string) {
    return apiFetch<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  async markPaid(id: string) {
    return apiFetch<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/mark-paid`, {
      method: 'POST',
    });
  },

  async markUnpaid(id: string) {
    return apiFetch<{ message: string; invoice: Invoice; rules: ReminderRule[] }>(`/api/invoices/${id}/mark-unpaid`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  },

  async toggleReminders(id: string, enabled: boolean) {
    return apiFetch<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/toggle-reminders`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  async sendNudge(
    id: string,
    options?: {
      channel?: 'email' | 'whatsapp' | 'both';
      recipient_phone?: string;
      tone?: string;
      customSubject?: string;
      customBody?: string;
    }
  ) {
    return apiFetch<{ message: string; success: boolean; channel: string; results: any; logs: ReminderLog[]; providerMessageId?: string }>(
      `/api/invoices/${id}/nudge`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }
    );
  },

  async getEmailPreview(id: string, stage: number = 1, tone: string = 'professional') {
    return apiFetch<{ subject: string; html: string; text: string }>(
      `/api/invoices/${id}/preview-email?stage=${stage}&tone=${encodeURIComponent(tone)}`
    );
  },

  // ---------------------------------------------------------------------------
  // CLIENTS
  // ---------------------------------------------------------------------------
  async listClients() {
    return apiFetch<{ clients: Client[] }>('/api/clients');
  },

  async createClient(data: { name: string; email: string; notes?: string; cin?: string; phone?: string; attn?: string }) {
    return apiFetch<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>) {
    return apiFetch<Client>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string) {
    return apiFetch<{ message: string }>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------------------------------------------------------------------------
  // REMINDERS
  // ---------------------------------------------------------------------------
  async listRules() {
    return apiFetch<{ rules: ReminderRule[] }>('/api/reminders/rules');
  },

  async listLogs() {
    return apiFetch<{ logs: ReminderLog[] }>('/api/reminders/logs');
  },

  async runSchedulerWorker() {
    return apiFetch<{ processed_count: number; results: any[] }>('/api/cron/process-reminders', {
      method: 'POST',
    });
  },

  // ---------------------------------------------------------------------------
  // AI ASSISTANT
  // ---------------------------------------------------------------------------
  async generateAiReminder(data: {
    invoice_id?: string;
    invoice_number?: string;
    amount?: number;
    due_date?: string;
    client_name?: string;
    tone: 'gentle' | 'professional' | 'firm' | 'urgent';
  }) {
    return apiFetch<{
      subject: string;
      body: string;
      tone: string;
      modelUsed: string;
      isFallback: boolean;
    }>('/api/ai/generate-reminder', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ---------------------------------------------------------------------------
  // INTEGRATIONS (REAL BACKEND OAUTH & WHATSAPP BUSINESS)
  // ---------------------------------------------------------------------------
  async getIntegrations() {
    return apiFetch<{
      success: boolean;
      integrations: SafeIntegration[];
      settings: IntegrationSettingsResponse;
    }>('/api/integrations');
  },

  async updateIntegrationSettings(settings: {
    default_reminder_channel: 'email' | 'whatsapp' | 'both';
    email_reminders_enabled?: boolean;
    whatsapp_reminders_enabled?: boolean;
  }) {
    return apiFetch<{
      success: boolean;
      message: string;
      settings: IntegrationSettingsResponse;
    }>('/api/integrations/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Email Integrations
  async startGoogleEmailOAuth() {
    return apiFetch<{ url: string; mode: string; redirect_uri: string }>('/api/integrations/email/google/start', {
      method: 'POST',
    });
  },

  async startMicrosoftEmailOAuth() {
    return apiFetch<{ url: string; mode: string; redirect_uri: string }>('/api/integrations/email/microsoft/start', {
      method: 'POST',
    });
  },

  async getEmailStatus() {
    return apiFetch<{
      success: boolean;
      provider: string;
      is_user_connected: boolean;
      status: string;
      display_email?: string;
    }>('/api/integrations/email/status');
  },

  async sendTestEmail() {
    return apiFetch<{
      success: boolean;
      provider: string;
      providerMessageId?: string;
      recipient: string;
      message: string;
      error?: string;
    }>('/api/integrations/email/test', {
      method: 'POST',
    });
  },

  async disconnectEmail(provider?: string) {
    return apiFetch<{ success: boolean; message: string }>('/api/integrations/email/disconnect', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  },

  async reconnectEmail(provider: string) {
    return apiFetch<{ success: boolean; message: string }>('/api/integrations/email/reconnect', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  },

  // WhatsApp Business Integrations
  async startWhatsAppBusiness() {
    return apiFetch<{
      success: boolean;
      redirect_uri: string;
      configured_waba_id?: string;
      configured_phone_id?: string;
      instructions: Record<string, string>;
    }>('/api/integrations/whatsapp/start', {
      method: 'POST',
    });
  },

  async connectWhatsAppBusiness(data: {
    phone_number_id: string;
    business_account_id?: string;
    access_token: string;
    business_name?: string;
    sender_phone?: string;
  }) {
    return apiFetch<{
      success: boolean;
      message: string;
      integration: SafeIntegration;
    }>('/api/integrations/whatsapp/callback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getWhatsAppStatus() {
    return apiFetch<{
      success: boolean;
      status: string;
      is_connected: boolean;
      business_name?: string;
      phone_id?: string;
      last_success_at?: string;
      last_error?: string;
    }>('/api/integrations/whatsapp/status');
  },

  async sendTestWhatsApp(recipient_phone?: string) {
    return apiFetch<{
      success: boolean;
      provider: string;
      providerMessageId?: string;
      recipient: string;
      message: string;
      error?: string;
    }>('/api/integrations/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify({ recipient_phone }),
    });
  },

  async disconnectWhatsApp() {
    return apiFetch<{ success: boolean; message: string }>('/api/integrations/whatsapp/disconnect', {
      method: 'POST',
    });
  },
};
