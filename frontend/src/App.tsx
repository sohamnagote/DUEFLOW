import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { InvoiceDetailView } from './components/InvoiceDetailView';
import { InvoicesView } from './components/InvoicesView';
import { ClientsView } from './components/ClientsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { InvoiceModal } from './components/InvoiceModal';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { ChannelConnectModal } from './components/ChannelConnectModal';
import { GiveReminderModal } from './components/GiveReminderModal';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import {
  initialInvoices,
  initialClients,
  initialActivities,
  initialReminderLogs,
  initialUserProfile,
} from './data/initialData';
import { Invoice, Client, ActivityItem, ReminderLog, UserProfile, CadenceStage, ReminderRule, DispatchChannel, IntegrationsConfig } from './types';
import { generateCadenceRules } from './utils/reminderEngine';
import { buildWhatsAppUrl, generateWhatsAppReminderMessage, ReminderTone } from './utils/whatsappEngine';
import { api, setStoredToken, clearStoredToken } from './lib/api';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('dueflow_auth_token'));
  });

  // Landing page by default unless already authenticated
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    return localStorage.getItem('dueflow_auth_token') ? 'app' : 'landing';
  });

  // Navigation & View state inside App
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname.replace(/\/$/, '') || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.replace(/\/$/, '') || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'invoices' | 'clients' | 'reminders' | 'settings'>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to purge any old prefilled dummy data
  const getCleanStorage = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      if (saved.includes('Komorebi') || saved.includes('soham@agency.in')) {
        localStorage.removeItem(key);
        return fallback;
      }
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  };

  // Core Data initialized cleanly
  const [user, setUser] = useState<UserProfile>(() => {
    return getCleanStorage('dueflow_clean_user', initialUserProfile);
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return getCleanStorage('dueflow_clean_invoices', initialInvoices);
  });

  const [clients, setClients] = useState<Client[]>(() => {
    return getCleanStorage('dueflow_clean_clients', initialClients);
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    return getCleanStorage('dueflow_clean_activities', initialActivities);
  });

  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => {
    return getCleanStorage('dueflow_clean_reminder_logs', initialReminderLogs);
  });

  // Modal states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [emailPreviewStage, setEmailPreviewStage] = useState<CadenceStage>(1);
  const [emailPreviewInvoice, setEmailPreviewInvoice] = useState<Invoice | null>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [quickReminderInvoice, setQuickReminderInvoice] = useState<Invoice | null>(null);
  const [isChannelConnectOpen, setIsChannelConnectOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Transform backend invoice record to UI Invoice shape
  const mapBackendInvoice = (inv: any, profile: UserProfile): Invoice => {
    const op = inv.operational_status || inv.status;
    let uiStatus: 'paid' | 'overdue' | 'due_soon' | 'scheduled' = 'scheduled';
    if (op === 'paid') uiStatus = 'paid';
    else if (op === 'overdue') uiStatus = 'overdue';
    else if (op === 'due_soon') uiStatus = 'due_soon';

    const clientName = inv.client_name_snapshot || inv.client_name || '';
    const clientEmail = inv.client_email_snapshot || inv.client_email || '';

    let uiRules: ReminderRule[] = [];
    if (inv.rules && Array.isArray(inv.rules) && inv.rules.length > 0) {
      uiRules = inv.rules.map((r: any, idx: number) => ({
        id: r.id,
        invoice_id: inv.id,
        stage_number: (idx + 1) as CadenceStage,
        stage_label: `Stage 0${idx + 1} · ${r.direction === 'before' ? `${r.offset_days} Days Before` : r.direction === 'on' ? 'Due Date' : `${r.offset_days} Days Overdue`}`,
        offset_days: r.direction === 'before' ? -r.offset_days : r.offset_days,
        subject_line: `Invoice ${inv.invoice_number} reminder`,
        scheduled_for: new Date(r.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: r.status === 'sent' ? 'delivered' : r.status === 'cancelled' ? 'cancelled' : 'scheduled',
      }));
    } else {
      uiRules = generateCadenceRules(inv.id, inv.invoice_number, inv.due_date, profile.default_tone || 'Gentle Creative Professional');
    }

    return {
      id: inv.id,
      user_id: inv.user_id,
      invoice_number: inv.invoice_number,
      client_id: inv.client_id || '',
      client_name: clientName,
      client_email: clientEmail,
      amount: Number(inv.amount),
      currency: 'INR',
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: uiStatus,
      reminders_enabled: inv.reminders_enabled ?? true,
      tone_template: (inv.template_key as any) || profile.default_tone || 'Gentle Creative Professional',
      cadence_architecture: 'Active · 4-Stage Automated Reminders',
      notes: inv.notes || '',
      paid_at: inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
      created_at: inv.created_at || new Date().toISOString(),
      rules: uiRules,
    };
  };

  // Fetch live data from backend API
  const refreshBackendData = useCallback(async () => {
    try {
      const [profileRes, invoicesRes, clientsRes, logsRes] = await Promise.all([
        api.getProfile().catch(() => null),
        api.listInvoices().catch(() => null),
        api.listClients().catch(() => null),
        api.listLogs().catch(() => null),
      ]);

      if (profileRes?.profile) {
        setUser((prev) => ({ ...prev, ...profileRes.profile }));
      }

      if (invoicesRes?.invoices) {
        const mapped = invoicesRes.invoices.map((inv: any) => mapBackendInvoice(inv, profileRes?.profile || user));
        setInvoices(mapped);
      }

      if (clientsRes?.clients) {
        setClients(clientsRes.clients);
      }

      if (logsRes?.logs) {
        const mappedLogs: ReminderLog[] = logsRes.logs.map((l: any) => ({
          id: l.id,
          invoice_id: l.invoice_id,
          invoice_number: l.invoice_number || 'INV',
          recipient_email: l.recipient_email,
          stage_name: l.occurrence_key || 'Automated Cadence Stage',
          status: l.status === 'delivered' ? 'sent' : (l.status as any),
          timestamp: new Date(l.attempted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider_message_id: l.provider_message_id || '',
          details: l.error_code || (l.status === 'sent' || l.status === 'delivered' ? `Dispatched via ${l.provider || 'email provider'}` : 'Delivery pending or rejected'),
        }));
        setReminderLogs(mappedLogs);
      }
    } catch (e) {
      console.warn('Backend sync note:', e);
    }
  }, []);

  useEffect(() => {
    refreshBackendData();
  }, [refreshBackendData]);

  // Handle Supabase Google OAuth state and session persistence
  useEffect(() => {
    if (!supabase) return;

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.access_token) {
          setStoredToken(session.access_token);
        }
        setIsAuthenticated(true);
        setUser((prev) => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || prev.full_name,
          business_name: session.user.user_metadata?.business_name || prev.business_name,
        }));
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        refreshBackendData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (session.access_token) {
          setStoredToken(session.access_token);
        }
        setIsAuthenticated(true);
        setUser((prev) => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || prev.full_name,
          business_name: session.user.user_metadata?.business_name || prev.business_name,
        }));
        setShowAuthScreen(false);
        setViewMode('app');
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        refreshBackendData();
        if (event === 'SIGNED_IN') {
          addToast('success', 'Signed In', `Welcome back, ${session.user.user_metadata?.full_name || session.user.email || ''}!`);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        clearStoredToken();
        setViewMode('landing');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshBackendData]);

  // Guard protected dashboard routes
  useEffect(() => {
    if (viewMode === 'app' && !isAuthenticated && !localStorage.getItem('dueflow_auth_token')) {
      setShowAuthScreen(true);
    }
  }, [viewMode, isAuthenticated]);

  // Sync state to local storage as fallback
  useEffect(() => {
    localStorage.setItem('dueflow_clean_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('dueflow_clean_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('dueflow_clean_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('dueflow_clean_reminder_logs', JSON.stringify(reminderLogs));
  }, [reminderLogs]);

  useEffect(() => {
    localStorage.setItem('dueflow_clean_user', JSON.stringify(user));
  }, [user]);

  // Currently viewed invoice
  const currentInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // Handlers
  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleBackToInvoices = () => {
    setSelectedInvoiceId(null);
  };

  // Toggle Mark as Paid / Unpaid via Backend API
  const handleTogglePaid = async (invoiceId: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const willBePaid = target.status !== 'paid';

    try {
      if (willBePaid) {
        await api.markPaid(invoiceId);

        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            return {
              ...inv,
              status: 'paid',
              reminders_enabled: false,
              paid_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              rules: inv.rules.map((r) => (r.status === 'scheduled' ? { ...r, status: 'cancelled' } : r)),
            };
          })
        );

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          invoice_id: target.id,
          invoice_number: `Invoice ${target.invoice_number}`,
          action_type: 'marked_paid',
          message: 'Marked paid',
          time_ago: 'JUST NOW',
          timestamp: new Date().toISOString(),
          status_tone: 'neutral',
        };
        setActivities((a) => [newActivity, ...a]);

        addToast('success', 'Invoice Settled', `${target.invoice_number} cleared. Future pending reminders cancelled.`);
      } else {
        await api.markUnpaid(invoiceId);

        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            return {
              ...inv,
              status: 'overdue',
              reminders_enabled: true,
              paid_at: undefined,
              rules: generateCadenceRules(inv.id, inv.invoice_number, inv.due_date, inv.tone_template),
            };
          })
        );

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          invoice_id: target.id,
          invoice_number: `Invoice ${target.invoice_number}`,
          action_type: 'marked_paid',
          message: 'Marked unpaid (Cadence resumed)',
          time_ago: 'JUST NOW',
          timestamp: new Date().toISOString(),
          status_tone: 'neutral',
        };
        setActivities((a) => [newActivity, ...a]);

        addToast('info', 'Invoice Re-opened', `${target.invoice_number} marked unpaid. Reminder schedule re-evaluated.`);
      }
    } catch (err: any) {
      addToast('error', 'Operation Failed', err.message || 'Could not update payment status');
    }
  };

  // Instant Nudge via Real Backend API
  const handleInstantNudge = async (inv: Invoice) => {
    try {
      const res = await api.sendNudge(inv.id);

      const logId = `log-${Date.now()}`;
      const newLog: ReminderLog = {
        id: logId,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        recipient_email: inv.client_email,
        stage_name: 'Instant Reminder',
        status: res.success ? 'sent' : 'failed',
        timestamp: 'Just now',
        provider_message_id: res.providerMessageId || `resend_${Date.now()}`,
        details: 'Payment reminder email sent via Resend.',
      };

      setReminderLogs((prev) => [newLog, ...prev]);

      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        invoice_id: inv.id,
        invoice_number: `Invoice ${inv.invoice_number}`,
        action_type: 'nudge_sent',
        message: 'Instant reminder sent',
        time_ago: 'JUST NOW',
        timestamp: new Date().toISOString(),
        status_tone: 'neutral',
      };
      setActivities((prev) => [newActivity, ...prev]);

      addToast(
        'success',
        'Reminder Sent',
        `Payment reminder delivered to ${inv.client_email}.`
      );
    } catch (err: any) {
      addToast('error', 'Reminder Failed', err.message || 'Failed to send reminder');
    }
  };

  // Give Reminder Now (Multi-channel: Email & WhatsApp)
  const handleGiveReminderNow = async (
    inv: Invoice,
    channel: DispatchChannel,
    clientPhone: string,
    tone: ReminderTone,
    customMessage?: string
  ) => {
    try {
      let stageLabel = 'Instant Follow-up';

      // 1. Advance next pending rule
      setInvoices((prev) =>
        prev.map((item) => {
          if (item.id !== inv.id) return item;
          const nextScheduledIdx = item.rules.findIndex((r) => r.status === 'scheduled');
          if (nextScheduledIdx !== -1) {
            stageLabel = item.rules[nextScheduledIdx].stage_label;
            const updatedRules = [...item.rules];
            updatedRules[nextScheduledIdx] = {
              ...updatedRules[nextScheduledIdx],
              status: 'delivered',
              channel,
              delivered_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            return {
              ...item,
              client_phone: clientPhone || item.client_phone,
              rules: updatedRules,
            };
          }
          return {
            ...item,
            client_phone: clientPhone || item.client_phone,
          };
        })
      );

      // 2. Dispatch via backend real API
      let providerId = `disp_${Date.now()}`;
      try {
        const res = await api.sendNudge(inv.id, {
          channel,
          recipient_phone: clientPhone || inv.client_phone,
          tone,
          customBody: customMessage,
        });
        if (res?.providerMessageId) providerId = res.providerMessageId;
      } catch (err: any) {
        console.warn('Backend nudge note:', err);
      }

      // 3. Launch WhatsApp client fallback if selected
      if (channel === 'whatsapp' || channel === 'both') {
        const phone = clientPhone || inv.client_phone || '';
        const msg = customMessage || generateWhatsAppReminderMessage(inv, user, tone);
        const waUrl = buildWhatsAppUrl(phone, msg);

        const a = document.createElement('a');
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // 4. Record real ReminderLog
      const logId = `log-${Date.now()}`;
      const newLog: ReminderLog = {
        id: logId,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        recipient_email: inv.client_email,
        recipient_phone: clientPhone || inv.client_phone,
        stage_name: `${stageLabel} · ${channel === 'both' ? 'Email + WhatsApp' : channel === 'whatsapp' ? 'WhatsApp' : 'Email'}`,
        status: 'sent',
        channel,
        timestamp: 'Just now',
        provider_message_id: providerId,
        details:
          channel === 'both'
            ? `Sent via email and WhatsApp to ${clientPhone || 'client'}.`
            : channel === 'whatsapp'
            ? `WhatsApp reminder sent to ${clientPhone || 'client'}.`
            : `Payment reminder email sent to ${inv.client_email}.`,
      };
      setReminderLogs((prev) => [newLog, ...prev]);

      // 5. Record Activity
      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        invoice_id: inv.id,
        invoice_number: `Invoice ${inv.invoice_number}`,
        action_type: 'reminder_sent',
        message:
          channel === 'both'
            ? 'Email & WhatsApp reminder sent'
            : channel === 'whatsapp'
            ? 'WhatsApp reminder sent'
            : 'Email reminder sent',
        time_ago: 'JUST NOW',
        timestamp: new Date().toISOString(),
        status_tone: 'neutral',
      };
      setActivities((prev) => [newActivity, ...prev]);

      addToast(
        'success',
        'Reminder Sent',
        `Follow-up for ${inv.invoice_number} sent via ${
          channel === 'both' ? 'Email & WhatsApp' : channel === 'whatsapp' ? 'WhatsApp' : 'Email'
        }.`
      );
    } catch (err: any) {
      addToast('error', 'Reminder Failed', err.message || 'Could not send reminder.');
    }
  };

  const handleSaveIntegrations = (config?: IntegrationsConfig) => {
    if (config) {
      setUser((prev) => ({
        ...prev,
        phone: config.whatsapp.sender_phone || prev.phone,
        integrations: config,
      }));
    }
    refreshBackendData();
    addToast('success', 'Channels Connected', 'Email & WhatsApp integrations saved.');
  };

  // Toggle Reminders Enabled via Real Backend API
  const handleToggleReminders = async (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const nextState = !inv.reminders_enabled;

    try {
      await api.toggleReminders(invoiceId, nextState);
      setInvoices((prev) =>
        prev.map((item) => (item.id === invoiceId ? { ...item, reminders_enabled: nextState } : item))
      );
      addToast(
        'info',
        nextState ? 'Cadence Activated' : 'Cadence Paused',
        nextState
          ? `Automated follow-up enabled for ${inv.invoice_number}`
          : `Automated reminders paused for ${inv.invoice_number}`
      );
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  // Save / Update Invoice via Real Backend API
  const handleSaveInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      if (invoiceToEdit) {
        await api.updateInvoice(invoiceToEdit.id, invoiceData);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceToEdit.id ? ({ ...inv, ...invoiceData } as Invoice) : inv))
        );
        addToast('success', 'Invoice Updated', `Changes saved to ${invoiceData.invoice_number}`);
      } else {
        const created = await api.createInvoice({
          client_name: invoiceData.client_name || '',
          client_email: invoiceData.client_email || '',
          invoice_number: invoiceData.invoice_number || '',
          amount: Number(invoiceData.amount || 0),
          issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
          due_date: invoiceData.due_date || new Date().toISOString().split('T')[0],
          notes: invoiceData.notes,
          template_key: 'cadence_default',
          reminders_enabled: invoiceData.reminders_enabled ?? true,
        });

        const uiInvoice = mapBackendInvoice(created, user);
        setInvoices((prev) => [uiInvoice, ...prev]);

        // Auto-refresh clients list
        api.listClients().then((res) => {
          if (res?.clients) setClients(res.clients);
        });

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          invoice_id: uiInvoice.id,
          invoice_number: `Invoice ${uiInvoice.invoice_number}`,
          action_type: 'invoice_created',
          message: 'Invoice created & reminders scheduled',
          time_ago: 'JUST NOW',
          timestamp: new Date().toISOString(),
          status_tone: 'neutral',
        };
        setActivities((prev) => [newActivity, ...prev]);

        addToast('success', 'Invoice Recorded', `${uiInvoice.invoice_number} created with 4-stage reminder schedule.`);
      }
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message || 'Could not save invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await api.deleteInvoice(invoiceId);
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
      setSelectedInvoiceId(null);
      addToast('info', 'Invoice Removed', 'Invoice deleted successfully.');
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  const handleOpenAddInvoice = () => {
    setInvoiceToEdit(null);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setInvoiceToEdit(inv);
    setIsInvoiceModalOpen(true);
  };

  const handlePreviewEmail = (stage: CadenceStage, inv: Invoice) => {
    setEmailPreviewStage(stage);
    setEmailPreviewInvoice(inv);
    setIsEmailPreviewOpen(true);
  };

  // Background Cadence Scheduler Run via Real Backend Cron Endpoint
  const handleRunScheduler = async () => {
    setIsSchedulerRunning(true);
    try {
      const res = await api.runSchedulerWorker();
      await refreshBackendData();
      setIsSchedulerRunning(false);

      if (res.processed_count > 0) {
        addToast(
          'success',
          'Reminder Check Completed',
          `Checked reminder schedules. Sent ${res.processed_count} reminder(s).`
        );
      } else {
        addToast('info', 'Reminder Status Checked', 'No reminders are due right now.');
      }
    } catch (err: any) {
      setIsSchedulerRunning(false);
      addToast('error', 'Reminder Check Failed', err.message || 'Check failed');
    }
  };

  const handleRetryFailedLog = async (logId: string) => {
    addToast('info', 'Retrying Delivery', 'Resending reminder...');
    await refreshBackendData();
  };

  const handleAddNewClient = async (clientData: Partial<Client>) => {
    try {
      const created = await api.createClient({
        name: clientData.name || '',
        email: clientData.email || '',
        notes: clientData.notes,
        cin: clientData.cin,
        phone: clientData.phone,
        attn: clientData.attn,
      });
      setClients((prev) => [created, ...prev]);
      addToast('success', 'Client Registered', `${created.name} saved to client directory.`);
    } catch (err: any) {
      addToast('error', 'Client Creation Failed', err.message);
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    try {
      const res = await api.updateProfile(updatedProfile);
      setUser((prev) => ({ ...prev, ...res.profile }));
      addToast('success', 'Settings Saved', 'Profile, banking, and reminder settings updated.');
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    await api.logout().catch(() => {});
    clearStoredToken();
    localStorage.clear();
    setIsAuthenticated(false);
    setInvoices([]);
    setClients([]);
    setActivities([]);
    setReminderLogs([]);
    setUser(initialUserProfile);
    setSelectedInvoiceId(null);
    setCurrentTab('dashboard');
    setViewMode('landing');
    setShowAuthScreen(false);
    addToast('info', 'Signed Out', 'You have been logged out.');
  };

  // Dedicated Public Routes (No Authentication Required)
  if (currentPath === '/privacy') {
    return <PrivacyPolicyPage />;
  }

  if (currentPath === '/terms') {
    return <TermsOfServicePage />;
  }

  // Auth / Login Modal Screen
  if (showAuthScreen) {
    return (
      <AuthView
        onLoginSuccess={(loggedInUser) => {
          setIsAuthenticated(true);
          setUser((prev) => ({ ...prev, ...loggedInUser }));
          setShowAuthScreen(false);
          setViewMode('app');
          refreshBackendData();
          addToast('success', 'Welcome', `Signed in as ${loggedInUser.full_name || loggedInUser.email}`);
        }}
        onBackToApp={() => setShowAuthScreen(false)}
      />
    );
  }

  // 1. Landing Page (Default View First)
  if (viewMode === 'landing') {
    return (
      <>
        <LandingView
          onEnterApp={(targetTab = 'dashboard') => {
            if (!isAuthenticated && !localStorage.getItem('dueflow_auth_token')) {
              setShowAuthScreen(true);
              return;
            }
            setCurrentTab(targetTab);
            setSelectedInvoiceId(null);
            setViewMode('app');
          }}
          onOpenLogin={() => setShowAuthScreen(true)}
        />
        <NotificationToast toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // 2. Application Dashboard / Invoices / Clients / Reminders / Settings
  return (
    <div className="min-h-screen bg-white text-[#1a1b22] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab as any);
          setSelectedInvoiceId(null);
        }}
        user={user}
        onOpenAuth={() => setShowAuthScreen(true)}
        onLogout={handleLogout}
        onGoToLanding={() => setViewMode('landing')}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area: offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Editorial Top Status Bar */}
        <Header
          onRunScheduler={handleRunScheduler}
          isSchedulerRunning={isSchedulerRunning}
          onAddInvoice={handleOpenAddInvoice}
          onToggleMobileSidebar={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenConnectChannels={() => setIsChannelConnectOpen(true)}
          whatsappConnected={Boolean(user.integrations?.whatsapp?.connected)}
        />

        {/* Dynamic Workspace Views: offset by top header height */}
        <main className="flex-1 overflow-y-auto pt-16 min-h-[calc(100vh-4rem)]">
          {selectedInvoiceId && currentInvoice ? (
            <InvoiceDetailView
              invoice={currentInvoice}
              user={user}
              onBack={handleBackToInvoices}
              onTogglePaid={handleTogglePaid}
              onInstantNudge={handleInstantNudge}
              onGiveReminderNow={handleGiveReminderNow}
              onToggleReminders={handleToggleReminders}
              onEditInvoice={handleEditInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onPreviewEmail={handlePreviewEmail}
              onSaveIntegrations={handleSaveIntegrations}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  invoices={invoices}
                  activities={activities}
                  onSelectInvoice={handleSelectInvoice}
                  onAddInvoice={handleOpenAddInvoice}
                  onViewAllInvoices={() => setCurrentTab('invoices')}
                  onGiveReminderNow={(inv) => setQuickReminderInvoice(inv)}
                  onOpenConnectChannels={() => setIsChannelConnectOpen(true)}
                />
              )}

              {currentTab === 'invoices' && (
                <InvoicesView
                  invoices={invoices}
                  onSelectInvoice={handleSelectInvoice}
                  onAddInvoice={handleOpenAddInvoice}
                  onTogglePaid={handleTogglePaid}
                  onGiveReminderNow={(inv) => setQuickReminderInvoice(inv)}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  invoices={invoices}
                  onSelectClientInvoices={() => setCurrentTab('invoices')}
                  onAddInvoiceForClient={() => handleOpenAddInvoice()}
                  onAddNewClient={handleAddNewClient}
                />
              )}

              {currentTab === 'reminders' && (
                <RemindersView
                  logs={reminderLogs}
                  invoices={invoices}
                  user={user}
                  onRunScheduler={handleRunScheduler}
                  isSchedulerRunning={isSchedulerRunning}
                  onRetryFailed={handleRetryFailedLog}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  user={user}
                  onUpdateUser={handleUpdateProfile}
                  onResetData={() => {
                    localStorage.clear();
                    setInvoices([]);
                    setClients([]);
                    setActivities([]);
                    setReminderLogs([]);
                    setUser(initialUserProfile);
                    addToast('info', 'Workspace Reset', 'Cleared local records.');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSave={handleSaveInvoice}
        initialInvoice={invoiceToEdit}
        clients={clients}
      />

      <EmailPreviewModal
        isOpen={isEmailPreviewOpen}
        onClose={() => setIsEmailPreviewOpen(false)}
        invoice={emailPreviewInvoice}
        stageNumber={emailPreviewStage}
        user={user}
        onSendTest={(inv) => handleInstantNudge(inv)}
      />

      {/* Quick Give Reminder Modal */}
      {quickReminderInvoice && (
        <GiveReminderModal
          isOpen={!!quickReminderInvoice}
          onClose={() => setQuickReminderInvoice(null)}
          invoice={quickReminderInvoice}
          user={user}
          onExecuteReminder={(inv, channel, phone, tone, customMsg) => {
            handleGiveReminderNow(inv, channel, phone, tone, customMsg);
          }}
          onOpenConnectChannels={() => {
            setQuickReminderInvoice(null);
            setIsChannelConnectOpen(true);
          }}
        />
      )}

      {/* Channel Integrations Modal */}
      <ChannelConnectModal
        isOpen={isChannelConnectOpen}
        onClose={() => setIsChannelConnectOpen(false)}
        user={user}
        onSaveIntegrations={handleSaveIntegrations}
      />

      {/* Floating Notification Feedback Toasts */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
