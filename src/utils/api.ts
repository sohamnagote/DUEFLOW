import { supabase } from './supabase';
import { Invoice, InvoiceStatus, Client, UserProfile, ReminderScheduleRule, ReminderQueueItem } from '../types';

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
      if (errorData.details) {
        let fieldDetails = '';
        if (Array.isArray(errorData.details)) {
          fieldDetails = errorData.details
            .map((d: any) => (typeof d === 'string' ? d : `${d.field || ''}: ${d.message || ''}`.replace(/^:\s*/, '')))
            .filter(Boolean)
            .join(', ');
        } else if (typeof errorData.details === 'object') {
          fieldDetails = Object.entries(errorData.details)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
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
    let rawProfile: any = null;
    try {
      rawProfile = await request<any>('/user/profile');
    } catch (_) {
      try {
        rawProfile = await request<any>('/profile');
      } catch (err) {
        console.warn('Could not load user profile from either endpoint:', err);
      }
    }
    const profile = rawProfile?.profile || rawProfile || {};
    const payment = await request<any>('/settings/payment').catch(() => ({}));
    return {
      fullName: profile.fullName || profile.full_name || profile.name || '',
      email: profile.email || '',
      preferredCurrency: (profile.preferredCurrency || profile.preferred_currency || 'INR') as 'INR' | 'USD',
      timezone: profile.timezone || 'Asia/Kolkata',
      upiId: payment.upiId || payment.upi_id || profile.upiId || profile.upi_id || '',
      beneficiaryName: payment.beneficiaryName || payment.beneficiary_name || profile.beneficiaryName || profile.businessName || '',
      bankName: payment.bankName || payment.bank_name || profile.bankName || '',
      accountNumber: payment.accountNumber || payment.account_number || profile.bankAccount || '',
      routingNumber: payment.routingNumber || payment.routing_number || profile.bankIfsc || '',
      paymentInstructions: payment.paymentInstructions || payment.payment_instructions || profile.paymentNotes || '',
      paymentQrUrl: payment.paymentQrUrl || payment.payment_qr_url || profile.paymentQrUrl || null,
      gmailConnected: false,
      automatedRemindersEnabled: profile.automatedRemindersEnabled ?? profile.emailRemindersEnabled ?? true,
    };
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    const profilePayload = {
      fullName: profile.fullName,
      full_name: profile.fullName,
      name: profile.fullName,
      email: profile.email,
      preferredCurrency: profile.preferredCurrency,
      preferred_currency: profile.preferredCurrency,
      timezone: profile.timezone,
      automatedRemindersEnabled: profile.automatedRemindersEnabled,
      emailRemindersEnabled: profile.automatedRemindersEnabled,
    };

    try {
      await request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profilePayload),
      });
    } catch (_) {
      try {
        await request('/profile', {
          method: 'PUT',
          body: JSON.stringify(profilePayload),
        });
      } catch (err) {
        console.warn('Failed to sync profile update:', err);
      }
    }

    await request('/settings/payment', {
      method: 'PUT',
      body: JSON.stringify({
        upiId: profile.upiId,
        upi_id: profile.upiId,
        beneficiaryName: profile.beneficiaryName,
        beneficiary_name: profile.beneficiaryName,
        businessName: profile.beneficiaryName,
        bankName: profile.bankName,
        bank_name: profile.bankName,
        accountNumber: profile.accountNumber,
        account_number: profile.accountNumber,
        bankAccount: profile.accountNumber,
        routingNumber: profile.routingNumber,
        routing_number: profile.routingNumber,
        bankIfsc: profile.routingNumber,
        paymentInstructions: profile.paymentInstructions,
        payment_instructions: profile.paymentInstructions,
        paymentNotes: profile.paymentInstructions,
        paymentQrUrl: profile.paymentQrUrl,
        payment_qr_url: profile.paymentQrUrl,
      }),
    }).catch(() => {});
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
    const raw = await request<any>('/clients');
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.clients)
      ? raw.clients
      : [];

    return list.map((c: any) => ({
      id: c.id || '',
      name: c.name || 'Unnamed Client',
      email: c.email || '',
      phone: c.phone || undefined,
      billingAddress: c.billingAddress || c.billing_address || c.address || undefined,
      internalNotes: c.internalNotes || c.internal_notes || c.notes || undefined,
      totalInvoiced: Number(c.totalInvoiced ?? c.total_invoiced ?? 0),
      totalOutstanding: Number(c.totalOutstanding ?? c.total_outstanding ?? c.pending_balance ?? 0),
      invoicesCount: Number(c.invoicesCount ?? c.invoices_count ?? 0),
      createdAt: c.createdAt || c.created_at || new Date().toISOString(),
    }));
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    const payload = {
      name: client.name?.trim(),
      email: client.email?.trim(),
      phone: client.phone?.trim() || undefined,
      billingAddress: client.billingAddress?.trim() || undefined,
      billing_address: client.billingAddress?.trim() || undefined,
      address: client.billingAddress?.trim() || undefined,
      internalNotes: client.internalNotes?.trim() || undefined,
      internal_notes: client.internalNotes?.trim() || undefined,
      notes: client.internalNotes?.trim() || undefined,
    };
    const raw = await request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const c = raw?.client || raw || {};
    return {
      id: c.id || '',
      name: c.name || client.name || 'Unnamed Client',
      email: c.email || client.email || '',
      phone: c.phone || client.phone,
      billingAddress: c.billingAddress || c.billing_address || c.address || client.billingAddress,
      internalNotes: c.internalNotes || c.internal_notes || c.notes || client.internalNotes,
      totalInvoiced: Number(c.totalInvoiced ?? c.total_invoiced ?? 0),
      totalOutstanding: Number(c.totalOutstanding ?? c.total_outstanding ?? c.pending_balance ?? 0),
      invoicesCount: Number(c.invoicesCount ?? c.invoices_count ?? 0),
      createdAt: c.createdAt || c.created_at || new Date().toISOString(),
    };
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const payload = {
      name: client.name?.trim(),
      email: client.email?.trim(),
      phone: client.phone?.trim() || undefined,
      billingAddress: client.billingAddress?.trim() || undefined,
      billing_address: client.billingAddress?.trim() || undefined,
      address: client.billingAddress?.trim() || undefined,
      internalNotes: client.internalNotes?.trim() || undefined,
      internal_notes: client.internalNotes?.trim() || undefined,
      notes: client.internalNotes?.trim() || undefined,
    };
    const raw = await request<any>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const c = raw?.client || raw || {};
    return {
      id: c.id || id,
      name: c.name || client.name || 'Unnamed Client',
      email: c.email || client.email || '',
      phone: c.phone || client.phone,
      billingAddress: c.billingAddress || c.billing_address || c.address || client.billingAddress,
      internalNotes: c.internalNotes || c.internal_notes || c.notes || client.internalNotes,
      totalInvoiced: Number(c.totalInvoiced ?? c.total_invoiced ?? 0),
      totalOutstanding: Number(c.totalOutstanding ?? c.total_outstanding ?? c.pending_balance ?? 0),
      invoicesCount: Number(c.invoicesCount ?? c.invoices_count ?? 0),
      createdAt: c.createdAt || c.created_at || new Date().toISOString(),
    };
  },

  async deleteClient(id: string): Promise<void> {
    await request(`/clients/${id}`, { method: 'DELETE' });
  },

  // --- Invoices ---
  async getInvoices(search?: string): Promise<Invoice[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const raw = await request<any>(`/invoices${query}`);
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.invoices)
      ? raw.invoices
      : [];

    return list.map((inv: any) => {
      const rawStatus = (inv.status || inv.operational_status || 'UNPAID').toLowerCase();
      const status: InvoiceStatus =
        rawStatus === 'paid' ? 'paid' :
        rawStatus === 'overdue' ? 'overdue' :
        rawStatus === 'draft' ? 'draft' : 'pending';

      const amount = Number(inv.amount ?? inv.totalAmount ?? inv.total_amount ?? 0);
      return {
        id: inv.id || '',
        invoiceNumber: inv.invoiceNumber || inv.invoice_number || '',
        clientId: inv.clientId || inv.client_id || undefined,
        clientName: inv.clientName || inv.client_name || inv.client_name_snapshot || 'Client',
        clientEmail: inv.clientEmail || inv.client_email || inv.client_email_snapshot || '',
        amount,
        currency: inv.currency || 'INR',
        issueDate: inv.issueDate || inv.issue_date || new Date().toISOString().split('T')[0],
        dueDate: inv.dueDate || inv.due_date || new Date().toISOString().split('T')[0],
        status,
        description: inv.description || inv.notes || '',
        items: Array.isArray(inv.items) && inv.items.length > 0
          ? inv.items.map((it: any) => ({
              description: it.description || 'Item',
              quantity: Number(it.quantity || 1),
              rate: Number(it.rate ?? it.unitPrice ?? it.unit_price ?? amount),
            }))
          : [
              {
                description: inv.description || inv.notes || 'Services rendered',
                quantity: 1,
                rate: amount,
              },
            ],
        remindersSentCount: Number(inv.remindersSentCount ?? inv.reminders_sent_count ?? 0),
      };
    });
  },

  async createInvoice(invoice: any): Promise<Invoice> {
    const invNumber = (invoice.invoiceNumber && String(invoice.invoiceNumber).trim()) ||
      ('INV-' + Math.floor(100000 + Math.random() * 900000));
    const issueDate = invoice.issueDate || new Date().toISOString().split('T')[0];
    const dueDate = invoice.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const clientName = invoice.clientName || 'Client';
    const clientEmail = invoice.clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const amount = Number(invoice.amount || 0);
    const currency = invoice.currency || 'INR';
    const description = invoice.description || 'Services rendered';

    const payload = {
      clientId: invoice.clientId || undefined,
      client_id: invoice.clientId || undefined,
      clientName,
      client_name: clientName,
      clientEmail,
      client_email: clientEmail,
      invoiceNumber: invNumber,
      invoice_number: invNumber,
      amount,
      totalAmount: amount,
      total_amount: amount,
      currency,
      issueDate,
      issue_date: issueDate,
      dueDate,
      due_date: dueDate,
      status: (invoice.status || 'UNPAID').toUpperCase(),
      description,
      notes: description,
      items: (invoice.items && invoice.items.length > 0)
        ? invoice.items.map((it: any) => ({
            description: it.description || 'Service item',
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.rate !== undefined ? it.rate : (it.unitPrice ?? amount)),
            unit_price: Number(it.rate !== undefined ? it.rate : (it.unitPrice ?? amount)),
            rate: Number(it.rate !== undefined ? it.rate : (it.unitPrice ?? amount)),
            amount: Number((it.quantity || 1) * (it.rate !== undefined ? it.rate : (it.unitPrice ?? amount))),
          }))
        : [
            {
              description,
              quantity: 1,
              unitPrice: amount,
              unit_price: amount,
              rate: amount,
              amount,
            },
          ],
    };

    const raw = await request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const inv = raw?.invoice || raw || {};
    const rawStatus = (inv.status || inv.operational_status || 'UNPAID').toLowerCase();
    const status: InvoiceStatus =
      rawStatus === 'paid' ? 'paid' :
      rawStatus === 'overdue' ? 'overdue' :
      rawStatus === 'draft' ? 'draft' : 'pending';

    const finalAmount = Number(inv.amount ?? inv.totalAmount ?? inv.total_amount ?? amount);
    return {
      id: inv.id || '',
      invoiceNumber: inv.invoiceNumber || inv.invoice_number || invNumber,
      clientId: inv.clientId || inv.client_id || invoice.clientId,
      clientName: inv.clientName || inv.client_name || inv.client_name_snapshot || clientName,
      clientEmail: inv.clientEmail || inv.client_email || inv.client_email_snapshot || clientEmail,
      amount: finalAmount,
      currency: inv.currency || currency,
      issueDate: inv.issueDate || inv.issue_date || issueDate,
      dueDate: inv.dueDate || inv.due_date || dueDate,
      status,
      description: inv.description || inv.notes || description,
      items: Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map((it: any) => ({
            description: it.description || 'Item',
            quantity: Number(it.quantity || 1),
            rate: Number(it.rate ?? it.unitPrice ?? it.unit_price ?? finalAmount),
          }))
        : [
            {
              description,
              quantity: 1,
              rate: finalAmount,
            },
          ],
      remindersSentCount: Number(inv.remindersSentCount ?? inv.reminders_sent_count ?? 0),
    };
  },

  async updateInvoice(id: string, invoice: any): Promise<Invoice> {
    const raw = await request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...invoice,
        client_name: invoice.clientName,
        client_email: invoice.clientEmail,
        invoice_number: invoice.invoiceNumber,
        due_date: invoice.dueDate,
        issue_date: invoice.issueDate,
        total_amount: invoice.amount,
        status: invoice.status ? invoice.status.toUpperCase() : undefined,
      }),
    });
    const inv = raw?.invoice || raw || {};
    const rawStatus = (inv.status || inv.operational_status || 'UNPAID').toLowerCase();
    const status: InvoiceStatus =
      rawStatus === 'paid' ? 'paid' :
      rawStatus === 'overdue' ? 'overdue' :
      rawStatus === 'draft' ? 'draft' : 'pending';

    const finalAmount = Number(inv.amount ?? inv.totalAmount ?? inv.total_amount ?? invoice.amount ?? 0);
    return {
      id: inv.id || id,
      invoiceNumber: inv.invoiceNumber || inv.invoice_number || invoice.invoiceNumber || '',
      clientId: inv.clientId || inv.client_id || invoice.clientId,
      clientName: inv.clientName || inv.client_name || inv.client_name_snapshot || invoice.clientName || 'Client',
      clientEmail: inv.clientEmail || inv.client_email || inv.client_email_snapshot || invoice.clientEmail || '',
      amount: finalAmount,
      currency: inv.currency || invoice.currency || 'INR',
      issueDate: inv.issueDate || inv.issue_date || invoice.issueDate,
      dueDate: inv.dueDate || inv.due_date || invoice.dueDate,
      status,
      description: inv.description || inv.notes || invoice.description || '',
      items: Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map((it: any) => ({
            description: it.description || 'Item',
            quantity: Number(it.quantity || 1),
            rate: Number(it.rate ?? it.unitPrice ?? it.unit_price ?? finalAmount),
          }))
        : [
            {
              description: inv.description || inv.notes || 'Services rendered',
              quantity: 1,
              rate: finalAmount,
            },
          ],
      remindersSentCount: Number(inv.remindersSentCount ?? inv.reminders_sent_count ?? 0),
    };
  },

  async deleteInvoice(id: string): Promise<void> {
    await request(`/invoices/${id}`, { method: 'DELETE' });
  },

  async markInvoicePaid(id: string): Promise<Invoice> {
    let raw: any;
    try {
      raw = await request<any>(`/invoices/${id}/mark-paid`, { method: 'POST' });
    } catch (_) {
      raw = await request<any>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID' }),
      });
    }
    const inv = raw?.invoice || raw || {};
    const amount = Number(inv.amount ?? inv.totalAmount ?? inv.total_amount ?? 0);
    return {
      id: inv.id || id,
      invoiceNumber: inv.invoiceNumber || inv.invoice_number || '',
      clientId: inv.clientId || inv.client_id,
      clientName: inv.clientName || inv.client_name || inv.client_name_snapshot || 'Client',
      clientEmail: inv.clientEmail || inv.client_email || inv.client_email_snapshot || '',
      amount,
      currency: inv.currency || 'INR',
      issueDate: inv.issueDate || inv.issue_date,
      dueDate: inv.dueDate || inv.due_date,
      status: 'paid',
      description: inv.description || inv.notes || '',
      items: Array.isArray(inv.items)
        ? inv.items.map((it: any) => ({
            description: it.description,
            quantity: Number(it.quantity || 1),
            rate: Number(it.rate ?? it.unitPrice ?? it.unit_price ?? amount),
          }))
        : [],
      remindersSentCount: Number(inv.remindersSentCount ?? inv.reminders_sent_count ?? 0),
    };
  },

  getInvoicePdfUrl(id: string): string {
    return `${API_BASE}/invoices/${id}/pdf`;
  },

  // --- Reminders ---
  async getUpcomingReminders(): Promise<ReminderQueueItem[]> {
    try {
      const raw = await request<any>('/reminders');
      const data: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.reminders)
        ? raw.reminders
        : [];

      return data.map((r: any) => ({
        id: r.id || '',
        clientName: r.clientName || r.client_name || 'Client',
        invoiceNumber: r.invoiceNumber || r.invoice_number || 'INV',
        relativeDueText: r.ruleLabel || r.rule_label || 'Scheduled reminder',
        scheduledText: r.scheduledAt || r.scheduled_at ? new Date(r.scheduledAt || r.scheduled_at).toLocaleString() : '',
        status: (r.status === 'SENT' ? 'sent' : r.status === 'PENDING' ? 'queued' : 'paused') as any,
      }));
    } catch {
      return [];
    }
  },

  async getReminderRules(): Promise<ReminderScheduleRule[]> {
    try {
      const raw = await request<any>('/reminders/rules');
      const data: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.rules)
        ? raw.rules
        : [];

      return data.map((r: any) => ({
        id: r.id || '',
        label: r.label || 'Reminder',
        timing: (r.timing ? r.timing.toLowerCase() : 'before') as any,
        days: r.daysOffset ?? r.days_offset ?? r.days ?? 0,
        tone: (r.tone ? r.tone.toLowerCase() : 'professional') as any,
        enabled: r.enabled ?? true,
        sendTime: r.sendTime || r.send_time || '09:00',
        timezone: r.timezone || 'Asia/Kolkata',
        invoiceId: r.invoiceId || r.invoice_id,
      }));
    } catch {
      return [];
    }
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
