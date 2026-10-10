import { supabase } from './supabase';
import { Invoice, Client, UserProfile, ReminderScheduleRule, ReminderQueueItem } from '../types';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
const API_BASE = (rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '') + '/api';

/**
 * Returns the current JWT access token from Supabase session, if available.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn('Error fetching Supabase auth session:', err);
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader();
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMsg = errorData.message;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null as unknown as T;
}

export const dueflowApi = {
  // --- Profile & Payment Settings ---
  async getProfile(): Promise<UserProfile> {
    const profile = await request<any>('/user/profile');
    const payment = await request<any>('/settings/payment').catch(() => ({}));
    return {
      fullName: profile.fullName || '',
      email: profile.email || '',
      preferredCurrency: profile.preferredCurrency || 'INR',
      timezone: profile.timezone || 'Asia/Kolkata',
      upiId: payment.upiId || '',
      beneficiaryName: payment.beneficiaryName || '',
      bankName: payment.bankName || '',
      accountNumber: payment.accountNumber || '',
      routingNumber: payment.routingNumber || '',
      paymentInstructions: payment.paymentInstructions || '',
      paymentQrUrl: payment.paymentQrUrl || null,
      gmailConnected: false,
      automatedRemindersEnabled: profile.automatedRemindersEnabled ?? true,
    };
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    await request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: profile.fullName,
        email: profile.email,
        preferredCurrency: profile.preferredCurrency,
        timezone: profile.timezone,
        automatedRemindersEnabled: profile.automatedRemindersEnabled,
      }),
    });

    await request('/settings/payment', {
      method: 'PUT',
      body: JSON.stringify({
        upiId: profile.upiId,
        beneficiaryName: profile.beneficiaryName,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        routingNumber: profile.routingNumber,
        paymentInstructions: profile.paymentInstructions,
        paymentQrUrl: profile.paymentQrUrl,
      }),
    });
  },

  async uploadQrCode(file: File): Promise<{ qrCodeUrl: string }> {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/settings/payment/qr`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload QR code');
    return res.json();
  },

  async deleteQrCode(): Promise<void> {
    await request('/settings/payment/qr', { method: 'DELETE' });
  },

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    return request<Client[]>('/clients');
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    return request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    return request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  },

  async deleteClient(id: string): Promise<void> {
    await request(`/clients/${id}`, { method: 'DELETE' });
  },

  // --- Invoices ---
  async getInvoices(search?: string): Promise<Invoice[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request<any[]>(`/invoices${query}`);
    return data.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      amount: inv.amount || inv.totalAmount,
      currency: inv.currency,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: (inv.status || 'UNPAID').toLowerCase() as any,
      description: inv.description || '',
      items: inv.items?.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.unitPrice,
      })),
      remindersSentCount: inv.remindersSentCount || 0,
    }));
  },

  async createInvoice(invoice: any): Promise<Invoice> {
    return request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        ...invoice,
        amount: invoice.amount,
        items: invoice.items?.map((it: any) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.rate,
        })),
      }),
    });
  },

  async updateInvoice(id: string, invoice: any): Promise<Invoice> {
    return request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  },

  async deleteInvoice(id: string): Promise<void> {
    await request(`/invoices/${id}`, { method: 'DELETE' });
  },

  async markInvoicePaid(id: string): Promise<Invoice> {
    return request<Invoice>(`/invoices/${id}/mark-paid`, { method: 'POST' });
  },

  getInvoicePdfUrl(id: string): string {
    return `${API_BASE}/invoices/${id}/pdf`;
  },

  // --- Reminders ---
  async getUpcomingReminders(): Promise<ReminderQueueItem[]> {
    const data = await request<any[]>('/reminders');
    return data.map((r) => ({
      id: r.id,
      clientName: r.clientName || 'Client',
      invoiceNumber: r.invoiceNumber || 'INV',
      relativeDueText: r.ruleLabel || 'Scheduled reminder',
      scheduledText: new Date(r.scheduledAt).toLocaleString(),
      status: r.status === 'SENT' ? 'sent' : r.status === 'PENDING' ? 'queued' : 'paused',
    }));
  },

  async getReminderRules(): Promise<ReminderScheduleRule[]> {
    const data = await request<any[]>('/reminders/rules');
    return data.map((r) => ({
      id: r.id,
      label: r.label,
      timing: r.timing.toLowerCase() as any,
      days: r.daysOffset,
      tone: r.tone.toLowerCase() as any,
      enabled: r.enabled,
      sendTime: r.sendTime || '09:00',
      timezone: r.timezone || 'Asia/Kolkata',
      invoiceId: r.invoiceId,
    }));
  },

  async createReminderRule(rule: Partial<ReminderScheduleRule>): Promise<ReminderScheduleRule> {
    const data = await request<any>('/reminders/rules', {
      method: 'POST',
      body: JSON.stringify({
        label: rule.label,
        timing: (rule.timing || 'BEFORE').toUpperCase(),
        daysOffset: rule.days ?? 0,
        sendTime: rule.sendTime || '09:00',
        tone: (rule.tone || 'FRIENDLY').toUpperCase(),
        timezone: rule.timezone || 'Asia/Kolkata',
        invoiceId: rule.invoiceId || null,
        enabled: rule.enabled ?? true,
      }),
    });
    return {
      id: data.id,
      label: data.label,
      timing: data.timing.toLowerCase() as any,
      days: data.daysOffset,
      tone: data.tone.toLowerCase() as any,
      enabled: data.enabled,
      sendTime: data.sendTime,
      timezone: data.timezone,
      invoiceId: data.invoiceId,
    };
  },

  async updateReminderRule(id: string, rule: Partial<ReminderScheduleRule>): Promise<ReminderScheduleRule> {
    const data = await request<any>(`/reminders/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        label: rule.label,
        timing: (rule.timing || 'BEFORE').toUpperCase(),
        daysOffset: rule.days ?? 0,
        sendTime: rule.sendTime || '09:00',
        tone: (rule.tone || 'FRIENDLY').toUpperCase(),
        timezone: rule.timezone || 'Asia/Kolkata',
        invoiceId: rule.invoiceId || null,
        enabled: rule.enabled ?? true,
      }),
    });
    return {
      id: data.id,
      label: data.label,
      timing: data.timing.toLowerCase() as any,
      days: data.daysOffset,
      tone: data.tone.toLowerCase() as any,
      enabled: data.enabled,
      sendTime: data.sendTime,
      timezone: data.timezone,
      invoiceId: data.invoiceId,
    };
  },

  async deleteReminderRule(id: string): Promise<void> {
    await request(`/reminders/rules/${id}`, { method: 'DELETE' });
  },

  async triggerReminder(id: string): Promise<void> {
    await request(`/reminders/${id}/trigger`, { method: 'POST' });
  },

  // --- Gmail Integration ---
  async getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
    return request<{ connected: boolean; email?: string }>('/integrations/gmail/status');
  },

  async getGmailAuthUrl(): Promise<{ url: string }> {
    return request<{ url: string }>('/integrations/gmail/oauth/url');
  },

  async disconnectGmail(): Promise<void> {
    await request('/integrations/gmail/disconnect', { method: 'POST' });
  },

  // --- Dashboard Summary ---
  async getDashboardSummary(): Promise<any> {
    return request('/dashboard');
  },

  // --- Notifications ---
  async getNotifications(): Promise<any[]> {
    return request<any[]>('/notifications');
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, { method: 'POST' });
  },
};
