import { supabase } from './supabase';
import { Invoice, Client, UserProfile, ReminderScheduleRule, ReminderQueueItem } from '../types';

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
const cleanRawUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';
const API_BASE = cleanRawUrl.endsWith('/api')
  ? cleanRawUrl
  : cleanRawUrl
  ? `${cleanRawUrl}/api`
  : '/api';

/**
 * Returns the current JWT access token from Supabase session, if available.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // If session is momentarily establishing right after OAuth redirect, wait briefly and retry once
      await new Promise((resolve) => setTimeout(resolve, 150));
      const retry = await supabase.auth.getSession();
      session = retry.data.session;
    }
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

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${cleanEndpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err?.name === 'TypeError' && err?.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network or CORS error: Unable to connect to DueFlow backend. Please check server availability.');
    }
    throw err;
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMsg = errorData.message;
      } else if (errorData.error) {
        errorMsg = errorData.error;
      }
      if (errorData.details && typeof errorData.details === 'object') {
        const fieldDetails = Object.entries(errorData.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (fieldDetails) {
          errorMsg = `${errorMsg} (${fieldDetails})`;
        }
      }
    } catch (_) {
      // response might be empty or non-JSON
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    return text ? JSON.parse(text) : (null as unknown as T);
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
    const raw = await request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        clientId: invoice.clientId || undefined,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        invoiceNumber: invoice.invoiceNumber ? String(invoice.invoiceNumber).trim() : undefined,
        amount: invoice.amount,
        currency: invoice.currency || 'INR',
        issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate,
        status: invoice.status ? invoice.status.toUpperCase() : 'UNPAID',
        description: invoice.description || 'Services rendered',
        items: invoice.items?.map((it: any) => ({
          description: it.description || 'Service item',
          quantity: it.quantity || 1,
          unitPrice: it.rate !== undefined ? it.rate : it.unitPrice,
        })),
      }),
    });
    return {
      id: raw.id,
      invoiceNumber: raw.invoiceNumber,
      clientId: raw.clientId,
      clientName: raw.clientName,
      clientEmail: raw.clientEmail,
      amount: raw.amount !== undefined ? raw.amount : raw.totalAmount,
      currency: raw.currency || 'INR',
      issueDate: raw.issueDate,
      dueDate: raw.dueDate,
      status: (raw.status || 'UNPAID').toLowerCase() as any,
      description: raw.description || '',
      items: raw.items?.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.unitPrice,
      })),
      remindersSentCount: raw.remindersSentCount || 0,
    };
  },

  async updateInvoice(id: string, invoice: any): Promise<Invoice> {
    const raw = await request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...invoice,
        status: invoice.status ? invoice.status.toUpperCase() : undefined,
      }),
    });
    return {
      id: raw.id,
      invoiceNumber: raw.invoiceNumber,
      clientId: raw.clientId,
      clientName: raw.clientName,
      clientEmail: raw.clientEmail,
      amount: raw.amount !== undefined ? raw.amount : raw.totalAmount,
      currency: raw.currency || 'INR',
      issueDate: raw.issueDate,
      dueDate: raw.dueDate,
      status: (raw.status || 'UNPAID').toLowerCase() as any,
      description: raw.description || '',
      items: raw.items?.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.unitPrice,
      })),
      remindersSentCount: raw.remindersSentCount || 0,
    };
  },

  async deleteInvoice(id: string): Promise<void> {
    await request(`/invoices/${id}`, { method: 'DELETE' });
  },

  async markInvoicePaid(id: string): Promise<Invoice> {
    const raw = await request<any>(`/invoices/${id}/mark-paid`, { method: 'POST' });
    return {
      id: raw.id,
      invoiceNumber: raw.invoiceNumber,
      clientId: raw.clientId,
      clientName: raw.clientName,
      clientEmail: raw.clientEmail,
      amount: raw.amount !== undefined ? raw.amount : raw.totalAmount,
      currency: raw.currency || 'INR',
      issueDate: raw.issueDate,
      dueDate: raw.dueDate,
      status: (raw.status || 'PAID').toLowerCase() as any,
      description: raw.description || '',
      items: raw.items?.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.unitPrice,
      })),
      remindersSentCount: raw.remindersSentCount || 0,
    };
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
