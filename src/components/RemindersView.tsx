import React, { useState, useEffect } from 'react';
import { Invoice, ReminderScheduleRule, ReminderQueueItem, ReminderHistoryItem, UserProfile } from '../types';
import { formatCurrency } from '../utils/currency';
import { dueflowApi } from '../utils/api';
import { ReminderSendingAnimation } from './animations/ReminderSendingAnimation';

interface RemindersViewProps {
  onRefineWithGemini?: (text: string) => Promise<string>;
  userPreferredCurrency?: 'INR' | 'USD';
  invoices?: Invoice[];
  userProfile?: UserProfile;
  onReminderSent?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  userPreferredCurrency = 'INR',
  invoices = [],
  userProfile,
  onReminderSent,
}) => {
  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
  const [subjectLine, setSubjectLine] = useState('Invoice {{invoice_number}} payment reminder');
  const [message, setMessage] = useState(
    `Hi {{client_name}},\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code.`
  );
  const [automatedEnabled, setAutomatedEnabled] = useState(
    userProfile?.automatedRemindersEnabled ?? true
  );
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Persisted Reminder Rules & Upcoming Queue
  const [rules, setRules] = useState<ReminderScheduleRule[]>([]);
  const [serverQueue, setServerQueue] = useState<ReminderQueueItem[]>([]);
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Remind Now State
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindSuccess, setRemindSuccess] = useState<string | null>(null);
  const [remindError, setRemindError] = useState<string | null>(null);
  const [sendingState, setSendingState] = useState<{
    isOpen: boolean;
    status: 'sending' | 'success' | 'error';
    recipientName: string;
    invoiceNumber: string;
    errorMessage?: string;
    targetId?: string;
  } | null>(null);

  // Add Trigger Form State
  const [formTiming, setFormTiming] = useState<'before' | 'on_due_date' | 'after'>('before');
  const [formDays, setFormDays] = useState<number>(3);
  const [formSendTime, setFormSendTime] = useState<string>('09:30');
  const [formTone, setFormTone] = useState<'friendly' | 'professional' | 'firm'>('friendly');
  const [formScopeInvoiceId, setFormScopeInvoiceId] = useState<string>('');
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  const activeTimezone = userProfile?.timezone || 'Asia/Kolkata';

  // Authoritative Gmail Status state (Phase 2)
  const [liveGmailStatus, setLiveGmailStatus] = useState<{
    connected: boolean;
    status: 'connected' | 'reconnect_required' | 'disconnected' | 'unavailable';
    email?: string;
  }>({
    connected: userProfile?.gmailConnected || false,
    status: userProfile?.gmailStatus || (userProfile?.gmailConnected ? 'connected' : 'disconnected'),
    email: userProfile?.gmailEmail,
  });

  useEffect(() => {
    if (userProfile) {
      setLiveGmailStatus({
        connected: userProfile.gmailConnected,
        status: userProfile.gmailStatus || (userProfile.gmailConnected ? 'connected' : 'disconnected'),
        email: userProfile.gmailEmail,
      });
    }
  }, [userProfile?.gmailConnected, userProfile?.gmailStatus, userProfile?.gmailEmail]);

  const loadRemindersData = async () => {
    setIsLoadingRules(true);
    setIsLoadingHistory(true);
    try {
      const [loadedRules, loadedQueue, loadedHistory, gStatusResult] = await Promise.allSettled([
        dueflowApi.getReminderRules(),
        dueflowApi.getUpcomingReminders(),
        dueflowApi.getReminderHistory(),
        dueflowApi.getGmailStatus(),
      ]);

      if (loadedRules.status === 'fulfilled') {
        setRules(loadedRules.value);
      } else {
        console.warn('Could not load reminder rules:', loadedRules.reason);
      }

      if (loadedQueue.status === 'fulfilled') {
        setServerQueue(loadedQueue.value);
      }

      if (loadedHistory.status === 'fulfilled') {
        setHistory(loadedHistory.value);
      }

      if (gStatusResult.status === 'fulfilled' && gStatusResult.value) {
        const g = gStatusResult.value;
        setLiveGmailStatus({
          connected: g.connected,
          status: g.connected ? 'connected' : 'disconnected',
          email: g.email,
        });
      }
    } catch (err: any) {
      setRulesError(err?.message || 'Failed to load reminders');
    } finally {
      setIsLoadingRules(false);
      setIsLoadingHistory(false);
    }
  };

  // Load persisted rules, queue, and history on mount
  useEffect(() => {
    loadRemindersData();
  }, []);

  const safeInvoices: Invoice[] = Array.isArray(invoices)
    ? (invoices.filter(Boolean) as Invoice[])
    : Array.isArray((invoices as any)?.invoices)
    ? (((invoices as any).invoices.filter(Boolean)) as Invoice[])
    : [];

  const upcomingQueue = React.useMemo(() => {
    // 1. If serverQueue has scheduled reminders, map them
    const scheduledItems = serverQueue.map((item) => {
      const matchedInvoice = safeInvoices.find(
        (inv) => inv.id === item.invoiceId || inv.invoiceNumber === item.invoiceNumber
      );
      const isOverdue = matchedInvoice ? matchedInvoice.status === 'overdue' : false;
      const formattedAmount = matchedInvoice
        ? formatCurrency(Number(matchedInvoice.amount || 0), matchedInvoice.currency || userPreferredCurrency)
        : '';

      return {
        id: item.id,
        invoiceId: item.invoiceId || matchedInvoice?.id,
        clientName: item.clientName || matchedInvoice?.clientName || 'Client',
        invoiceNumber: item.invoiceNumber || matchedInvoice?.invoiceNumber || 'INV',
        relativeDueText: item.relativeDueText
          ? `${item.relativeDueText}${formattedAmount ? ` • ${formattedAmount}` : ''}`
          : 'Scheduled reminder',
        status: isOverdue ? 'Overdue' : item.status === 'sent' ? 'Sent' : 'Queued',
        isOverdue,
      };
    });

    // 2. Also include any unpaid invoices from safeInvoices that do not have a scheduled reminder
    const scheduledInvoiceNumbers = new Set(scheduledItems.map((s) => s.invoiceNumber));
    const invoiceItems = safeInvoices
      .filter((inv) => inv && (inv.status === 'pending' || inv.status === 'overdue' || (inv.status as string) === 'unpaid'))
      .filter((inv) => !scheduledInvoiceNumbers.has(inv.invoiceNumber))
      .map((inv) => {
        const isOverdue = inv.status === 'overdue';
        const formattedAmount = formatCurrency(Number(inv.amount || 0), inv.currency || userPreferredCurrency);
        return {
          id: inv.id || '',
          invoiceId: inv.id,
          clientName: inv.clientName || 'Client',
          invoiceNumber: inv.invoiceNumber || 'INV',
          relativeDueText: isOverdue
            ? `Overdue • Due date was ${inv.dueDate || 'past'} • ${formattedAmount}`
            : `Due on ${inv.dueDate || 'soon'} • ${formattedAmount}`,
          status: isOverdue ? 'Overdue' : 'Queued',
          isOverdue,
        };
      });

    return [...scheduledItems, ...invoiceItems];
  }, [safeInvoices, serverQueue, userPreferredCurrency]);

  const eligibleInvoices = safeInvoices.filter(
    (inv) => inv && (inv.status === 'pending' || inv.status === 'overdue' || (inv.status as string) === 'unpaid')
  );
  const eligibleInvoicesCount = eligibleInvoices.length;

  const triggerSummary = !automatedEnabled
    ? 'Automated reminders are paused globally.'
    : `${rules.length} reminder rule${rules.length === 1 ? '' : 's'} configured • ${eligibleInvoicesCount} eligible unpaid invoice${eligibleInvoicesCount === 1 ? '' : 's'}`;

  const handleToneSelect = (selected: 'friendly' | 'professional' | 'firm') => {
    setTone(selected);
    if (selected === 'friendly') {
      setSubjectLine('Friendly note: Invoice {{invoice_number}} payment reminder');
      setMessage(
        `Hi {{client_name}},\n\nHope you're having a great week!\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code. Let me know if you need anything!`
      );
    } else if (selected === 'firm') {
      setSubjectLine('Payment overdue notice: Invoice {{invoice_number}}');
      setMessage(
        `Dear {{client_name}},\n\nAccording to our records, payment for invoice {{invoice_number}} totaling {{total_amount}} was due on {{due_date}} and remains outstanding.\n\nPlease settle the balance using the attached payment details or QR code today.`
      );
    } else {
      setSubjectLine('Invoice {{invoice_number}} payment reminder');
      setMessage(
        `Hi {{client_name}},\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code.`
      );
    }
  };

  const handleGlobalToggle = async () => {
    const nextVal = !automatedEnabled;
    setAutomatedEnabled(nextVal);
    try {
      await dueflowApi.updateProfile({ automatedRemindersEnabled: nextVal });
    } catch (err) {
      console.warn('Could not sync automation toggle with backend:', err);
    }
  };

  const handleSaveTemplate = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handlePresetSelect = (presetType: 'before_3' | 'on_due' | 'after_5') => {
    if (presetType === 'before_3') {
      setFormTiming('before');
      setFormDays(3);
      setFormTone('friendly');
    } else if (presetType === 'on_due') {
      setFormTiming('on_due_date');
      setFormDays(0);
      setFormTone('professional');
    } else {
      setFormTiming('after');
      setFormDays(5);
      setFormTone('firm');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const days = formTiming === 'on_due_date' ? 0 : Number(formDays);
    if (formTiming !== 'on_due_date' && (isNaN(days) || days < 1)) {
      setFormError('Please enter a valid number of days (at least 1 day).');
      return;
    }

    if (!formSendTime || !/^\d{2}:\d{2}$/.test(formSendTime)) {
      setFormError('Please select a valid send time (HH:MM).');
      return;
    }

    // Build human readable label
    let label = '';
    if (formTiming === 'on_due_date') {
      label = `On due date at ${formSendTime}`;
    } else if (formTiming === 'before') {
      label = `${days} day${days > 1 ? 's' : ''} before due date at ${formSendTime}`;
    } else {
      label = `${days} day${days > 1 ? 's' : ''} after due date at ${formSendTime}`;
    }

    setActionLoading(true);
    try {
      const created = await dueflowApi.createReminderRule({
        label,
        timing: formTiming,
        days,
        sendTime: formSendTime,
        timezone: activeTimezone,
        tone: formTone,
        invoiceId: formScopeInvoiceId || undefined,
        enabled: formEnabled,
      });

      setRules((prev) => [...prev, created]);
      setShowAddModal(false);
      // Reset form defaults
      setFormTiming('before');
      setFormDays(3);
      setFormSendTime('09:30');
      setFormTone('friendly');
      setFormScopeInvoiceId('');
      setFormEnabled(true);
    } catch (err: any) {
      console.error('Failed to create reminder rule:', err);
      setFormError(err?.message || 'Failed to save reminder rule to database.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await dueflowApi.deleteReminderRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err: any) {
      console.error('Failed to delete reminder rule:', err);
      alert(err?.message || 'Could not delete reminder rule.');
    }
  };

  const handleRemindNow = async (id: string, invoiceNumber?: string, clientName?: string) => {
    if (remindingId) return;
    setRemindingId(id);
    setRemindSuccess(null);
    setRemindError(null);

    // Open signature sending animation modal
    setSendingState({
      isOpen: true,
      status: 'sending',
      recipientName: clientName || 'Client',
      invoiceNumber: invoiceNumber || 'INV',
      targetId: id,
    });

    try {
      const res = await dueflowApi.triggerReminder(id);
      const label = invoiceNumber ? ` for invoice ${invoiceNumber}` : '';
      setRemindSuccess(res.message || `Payment reminder sent successfully${label}.`);
      setSendingState((prev) => (prev ? { ...prev, status: 'success' } : null));

      // Refresh both serverQueue and history
      try {
        const [loadedQueue, loadedHistory] = await Promise.allSettled([
          dueflowApi.getUpcomingReminders(),
          dueflowApi.getReminderHistory(),
        ]);
        if (loadedQueue.status === 'fulfilled') setServerQueue(loadedQueue.value);
        if (loadedHistory.status === 'fulfilled') setHistory(loadedHistory.value);
      } catch (_) {}

      // Notify parent to refresh invoices (remindersSentCount)
      if (onReminderSent) {
        onReminderSent();
      }

      // Auto close after satisfying delivered animation
      setTimeout(() => {
        setSendingState(null);
      }, 2400);

      setTimeout(() => setRemindSuccess(null), 6000);
    } catch (err: any) {
      console.error('Failed to dispatch manual reminder:', err);
      const msg = err?.message || 'Failed to send reminder email. Please check your Gmail connection in Settings.';
      setRemindError(msg);
      setSendingState((prev) => (prev ? { ...prev, status: 'error', errorMessage: msg } : null));

      // Refresh history even on error so any recorded attempt/failure is displayed
      try {
        const loadedHistory = await dueflowApi.getReminderHistory();
        setHistory(loadedHistory);
      } catch (_) {}

      setTimeout(() => setRemindError(null), 8000);
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] px-6 sm:px-14 py-8 space-y-12 max-w-5xl">
      {/* Editorial Header Section */}
      <section className="space-y-1">
        <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] dark:text-[#f3f6fa] tracking-tight">
          Reminders
        </h1>
        <p className="text-sm text-[#44474d] dark:text-[#94a3b8]">
          Choose when DueFlow should email clients about unpaid invoices.
        </p>
      </section>

      {/* Automation Status & Metrics Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#ffffff] dark:bg-[#141f2e] border border-[#001126]/8 dark:border-white/10 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#74777d] dark:text-[#94a3b8] block">
            Schedule Rules
          </span>
          <span className="text-base font-bold text-[#001126] dark:text-[#f3f6fa] mt-0.5 block tabular-nums">
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'} configured
          </span>
          <p className="text-[11px] text-[#44474d] dark:text-[#94a3b8] mt-1">
            Execution triggers defining when emails are dispatched.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#ffffff] dark:bg-[#141f2e] border border-[#001126]/8 dark:border-white/10 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#74777d] dark:text-[#94a3b8] block">
            Eligible Invoices
          </span>
          <span className="text-base font-bold text-[#001126] dark:text-[#f3f6fa] mt-0.5 block tabular-nums">
            {eligibleInvoicesCount} eligible unpaid {eligibleInvoicesCount === 1 ? 'invoice' : 'invoices'}
          </span>
          <p className="text-[11px] text-[#44474d] dark:text-[#94a3b8] mt-1">
            {eligibleInvoicesCount === 0 ? 'No pending unpaid invoices need follow-ups.' : 'Unpaid invoices queued for automatic reminders.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#ffffff] dark:bg-[#141f2e] border border-[#001126]/8 dark:border-white/10 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#74777d] dark:text-[#94a3b8] block">
            Gmail Connection
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                liveGmailStatus.status === 'connected'
                  ? 'bg-[#3d6562] dark:bg-[#68b5ad]'
                  : liveGmailStatus.status === 'reconnect_required'
                  ? 'bg-[#d97706]'
                  : 'bg-[#ba1a1a] dark:bg-[#ffb4ab]'
              }`}
            />
            <span className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa]">
              {liveGmailStatus.status === 'connected'
                ? `Connected (${liveGmailStatus.email || 'Ready'})`
                : liveGmailStatus.status === 'reconnect_required'
                ? 'Reconnection required'
                : 'Disconnected'}
            </span>
          </div>
          <p className="text-[11px] text-[#44474d] dark:text-[#94a3b8] mt-1">
            {liveGmailStatus.status === 'connected'
              ? 'Automated emails dispatch through your verified Gmail.'
              : liveGmailStatus.status === 'reconnect_required'
              ? 'Google token expired. Reconnect in Settings to dispatch emails.'
              : 'Connect Gmail in Settings to enable email dispatch.'}
          </p>
        </div>
      </section>

      {/* Section 1: Reminder Schedule */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
              Reminder schedule
            </h2>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
              Set custom execution times and offsets in {activeTimezone}.
            </p>
          </div>
          {rules.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-action-primary w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-lg shadow-sm self-start sm:self-auto cursor-pointer"
            >
              + ADD REMINDER
            </button>
          )}
        </div>

        {isLoadingRules ? (
          <div className="p-8 text-center text-xs text-[#74777d] dark:text-[#94a3b8] bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10">
            Loading scheduled reminder rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#eae8e3] dark:bg-[#1f2d40] flex items-center justify-center text-[#44474d] dark:text-[#94a3b8]">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
                No reminders scheduled
              </h3>
              <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
                Configure when your clients should receive automated reminders.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-action-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-lg shadow-sm"
            >
              + ADD REMINDER
            </button>
          </div>
        ) : (
          <div className="bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 p-6 space-y-3">
            {rules.map((rule) => {
              const matchedInvoice = rule.invoiceId
                ? safeInvoices.find((inv) => inv.id === rule.invoiceId)
                : null;
              const canRemindRule = !!rule.invoiceId && !!matchedInvoice && matchedInvoice.status !== 'paid';

              return (
                <div
                  key={rule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#ffffff] dark:bg-[#141f2e] rounded-lg border border-[#001126]/5 dark:border-white/10 shadow-2xs gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#001126] dark:text-[#f3f6fa]">
                        {rule.label}
                      </span>
                      <span className="text-[10px] uppercase font-['Space_Mono'] px-2 py-0.5 rounded bg-[#001126]/5 dark:bg-white/10 text-[#44474d] dark:text-[#94a3b8]">
                        {rule.tone} tone
                      </span>
                      {rule.invoiceId && (
                        <span className="text-[10px] font-['Space_Mono'] px-2 py-0.5 rounded bg-[#3d6562]/10 dark:bg-[#3d6562]/30 text-[#3d6562] dark:text-[#68b5ad] font-semibold">
                          {matchedInvoice ? `Invoice ${matchedInvoice.invoiceNumber}` : `Invoice ${rule.invoiceId.substring(0, 8)}`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#74777d] dark:text-[#94a3b8] font-['Space_Mono']">
                      Local time: {rule.sendTime || '09:00'} • Timezone: {rule.timezone || activeTimezone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {canRemindRule && (
                      <button
                        type="button"
                        onClick={() => handleRemindNow(rule.invoiceId!, matchedInvoice?.invoiceNumber, matchedInvoice?.clientName)}
                        disabled={remindingId !== null}
                        className="btn-action-secondary text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50"
                        title={`Send payment reminder now for invoice ${matchedInvoice?.invoiceNumber}`}
                      >
                        {remindingId === rule.invoiceId ? (
                          <>
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[13px] text-[#001126] dark:text-[#f3f6fa]">send</span>
                            <span>Remind Now</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] hover:bg-[#ffdad6]/40 dark:hover:bg-[#ffdad6]/10 px-2.5 py-1.5 rounded transition-colors font-medium active:scale-95 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-action-secondary text-xs font-semibold px-3 py-1.5 rounded-lg inline-block"
            >
              + Add another reminder timing
            </button>
          </div>
        )}
      </section>

      {/* Section 2: Active Automation & Reminders */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
            Active automation & reminders
          </h2>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
            Manage global execution and view active trigger counts.
          </p>
        </div>

        <div className="bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 p-6 space-y-6">
          {remindSuccess && (
            <div className="p-3 bg-[#3d6562]/10 dark:bg-[#3d6562]/30 border border-[#3d6562]/20 rounded-lg text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{remindSuccess}</span>
            </div>
          )}
          {remindError && (
            <div className="p-3 bg-[#ba1a1a]/10 dark:bg-[#ba1a1a]/30 border border-[#ba1a1a]/20 rounded-lg text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{remindError}</span>
            </div>
          )}

          {/* Global Toggle Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#001126]/5 dark:border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-[#001126] dark:text-[#f3f6fa]">
                Enable automated reminder emails globally
              </h3>
              <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
                {triggerSummary}
              </p>
            </div>
            <button
              onClick={handleGlobalToggle}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                automatedEnabled ? 'bg-[#15263c] dark:bg-[#38bdf8]' : 'bg-[#c4c6cd] dark:bg-[#475569]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#ffffff] transition-transform ${
                  automatedEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger Queue List */}
          <div className="space-y-3">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] block">
              UPCOMING TRIGGER QUEUE
            </span>

            {upcomingQueue.length === 0 ? (
              <div className="p-6 bg-[#ffffff]/80 dark:bg-[#141f2e] rounded-xl border border-[#001126]/5 dark:border-white/10 text-center py-8">
                <span className="material-symbols-outlined text-[24px] text-[#74777d] dark:text-[#94a3b8] mb-1.5 block">
                  notifications_off
                </span>
                <p className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                  {rules.length} reminder {rules.length === 1 ? 'rule' : 'rules'} configured • 0 eligible unpaid invoices
                </p>
                <p className="text-[11px] text-[#74777d] dark:text-[#94a3b8] mt-1 max-w-sm mx-auto">
                  All current invoices are either paid or no unpaid invoices exist. Reminders will automatically queue when new unpaid invoices are created.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#ffffff] dark:bg-[#141f2e] rounded-lg border border-[#001126]/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                        {item.clientName} • {item.invoiceNumber}
                      </h4>
                      <p className="font-['Space_Mono'] text-[10px] text-[#44474d] dark:text-[#94a3b8] mt-0.5">
                        {item.relativeDueText}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                      <span
                        className={`font-['Space_Mono'] text-[9px] uppercase px-2.5 py-0.5 rounded-full ${
                          item.isOverdue
                            ? 'bg-[#ba1a1a]/10 dark:bg-[#ba1a1a]/30 text-[#ba1a1a] dark:text-[#ffb4ab]'
                            : 'bg-[#001126]/8 dark:bg-white/10 text-[#001126] dark:text-[#f3f6fa]'
                        }`}
                      >
                        {item.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemindNow(item.id, item.invoiceNumber, item.clientName)}
                        disabled={remindingId !== null}
                        className="btn-action-secondary text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50"
                        title={`Send payment reminder now for invoice ${item.invoiceNumber}`}
                      >
                        {remindingId === item.id ? (
                          <>
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[13px] text-[#001126] dark:text-[#f3f6fa]">send</span>
                            <span>Remind Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Reminder Delivery History */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
              Reminder delivery history
            </h2>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
              Audited delivery logs of automated and manual reminder emails.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsLoadingHistory(true);
              try {
                const res = await dueflowApi.getReminderHistory();
                setHistory(res);
              } finally {
                setIsLoadingHistory(false);
              }
            }}
            disabled={isLoadingHistory}
            className="btn-action-secondary text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
            title="Refresh reminder delivery history"
          >
            <span className={`material-symbols-outlined text-[14px] ${isLoadingHistory ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh history</span>
          </button>
        </div>

        <div className="bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 p-6 space-y-3">
          {isLoadingHistory && history.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#74777d] dark:text-[#94a3b8] bg-[#ffffff]/60 dark:bg-[#141f2e] rounded-lg border border-[#001126]/5 dark:border-white/10">
              Loading reminder delivery history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 bg-[#ffffff]/60 dark:bg-[#141f2e] rounded-lg border border-[#001126]/5 dark:border-white/10 text-center flex flex-col items-center justify-center space-y-2">
              <span className="material-symbols-outlined text-[24px] text-[#74777d] dark:text-[#94a3b8]">
                history_edu
              </span>
              <p className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">No reminder delivery history yet</p>
              <p className="text-[11px] text-[#74777d] dark:text-[#94a3b8]">
                When automated schedules trigger or you click "Remind Now", delivery attempts will be audited here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((record) => {
                const isSent = record.status === 'SENT';
                const isManual = record.scheduledReminderId === 'MANUAL' || !record.scheduledReminderId;
                return (
                  <div
                    key={record.id}
                    className="p-3.5 bg-[#ffffff] dark:bg-[#141f2e] rounded-lg border border-[#001126]/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-['Space_Mono'] font-bold px-2 py-0.5 rounded-full ${
                            isSent
                              ? 'bg-[#3d6562]/10 dark:bg-[#3d6562]/30 text-[#3d6562] dark:text-[#68b5ad]'
                              : 'bg-[#ba1a1a]/10 dark:bg-[#ba1a1a]/30 text-[#ba1a1a] dark:text-[#ffb4ab]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {isSent ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{record.status}</span>
                        </span>
                        <span className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                          {record.subject || 'Payment Reminder'}
                        </span>
                        <span className="text-[10px] font-['Space_Mono'] px-2 py-0.5 rounded bg-[#001126]/5 dark:bg-white/10 text-[#44474d] dark:text-[#94a3b8]">
                          {isManual ? 'Manual Dispatch' : 'Scheduled Autopilot'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#74777d] dark:text-[#94a3b8] font-['Space_Mono']">
                        <span>To: {record.recipientEmail}</span>
                        <span>•</span>
                        <span>{new Date(record.attemptedAt).toLocaleString()}</span>
                      </div>
                      {isSent && record.providerMessageId && (
                        <p className="text-[10px] text-[#3d6562] dark:text-[#68b5ad] font-['Space_Mono']">
                          Gmail Provider ID: {record.providerMessageId}
                        </p>
                      )}
                      {!isSent && record.errorMessage && (
                        <p className="text-[10px] text-[#ba1a1a] dark:text-[#ffb4ab] font-['Space_Mono']">
                          Error: {record.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Email Template */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
            Email template
          </h2>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
            Customize the message sent with your invoice.
          </p>
        </div>

        <div className="bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-6">
          {/* Tone Selector */}
          <div className="flex items-center justify-between">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] dark:text-[#94a3b8]">
              TONE
            </span>
            <div className="inline-flex rounded border border-[#001126]/10 dark:border-white/10 bg-[#ffffff] dark:bg-[#141f2e] p-0.5">
              {(['friendly', 'professional', 'firm'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleToneSelect(t)}
                  className={`px-4 py-1 text-xs capitalize transition-all ${
                    tone === t
                      ? 'bg-[#ffffff] dark:bg-[#203046] font-semibold text-[#001126] dark:text-[#f3f6fa] shadow-2xs'
                      : 'text-[#44474d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] dark:text-[#94a3b8] block">
              SUBJECT LINE
            </span>
            <input
              type="text"
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
            />
          </div>

          {/* Email Message */}
          <div className="space-y-1.5">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] dark:text-[#94a3b8] block">
              EMAIL MESSAGE
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full p-4 bg-[#fbf9f4] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8] leading-relaxed resize-y"
            />
          </div>

          {/* Bottom Bar: Preview Email & Save Template */}
          <div className="pt-4 flex items-center justify-between border-t border-[#001126]/5 dark:border-white/10">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="btn-action-secondary font-['Space_Mono'] text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg"
            >
              PREVIEW EMAIL
            </button>
            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold">Saved!</span>
              )}
              <button
                onClick={handleSaveTemplate}
                className="btn-action-primary px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-lg shadow-sm"
              >
                SAVE TEMPLATE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Reminder Modal with Presets + Full Custom Schedule */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#001126]/10 dark:border-white/10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#001126]/10 dark:border-white/10">
              <h3 className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">Add Reminder Trigger</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#44474d] dark:text-[#94a3b8]">Quick Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('before_3')}
                  className={`p-2.5 rounded-lg text-xs font-medium text-center border transition-all active:scale-95 ${
                    formTiming === 'before' && formDays === 3
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                      : 'bg-[#f5f3ee] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203046] text-[#1b1c19] dark:text-[#f3f6fa] border-transparent'
                  }`}
                >
                  3 days before
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('on_due')}
                  className={`p-2.5 rounded-lg text-xs font-medium text-center border transition-all active:scale-95 ${
                    formTiming === 'on_due_date'
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                      : 'bg-[#f5f3ee] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203046] text-[#1b1c19] dark:text-[#f3f6fa] border-transparent'
                  }`}
                >
                  On due date
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('after_5')}
                  className={`p-2.5 rounded-lg text-xs font-medium text-center border transition-all active:scale-95 ${
                    formTiming === 'after' && formDays === 5
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                      : 'bg-[#f5f3ee] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203046] text-[#1b1c19] dark:text-[#f3f6fa] border-transparent'
                  }`}
                >
                  5 days overdue
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
              {/* Timing Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1.5">
                  When should the reminder be sent?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTiming('before')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      formTiming === 'before'
                        ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                        : 'bg-[#fbf9f4] dark:bg-[#0c131d] border-[#001126]/15 dark:border-white/10 text-[#1b1c19] dark:text-[#f3f6fa]'
                    }`}
                  >
                    Before due date
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTiming('on_due_date');
                      setFormDays(0);
                    }}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      formTiming === 'on_due_date'
                        ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                        : 'bg-[#fbf9f4] dark:bg-[#0c131d] border-[#001126]/15 dark:border-white/10 text-[#1b1c19] dark:text-[#f3f6fa]'
                    }`}
                  >
                    On due date
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTiming('after')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      formTiming === 'after'
                        ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#ffffff] dark:text-[#0c131d] border-transparent font-bold'
                        : 'bg-[#fbf9f4] dark:bg-[#0c131d] border-[#001126]/15 dark:border-white/10 text-[#1b1c19] dark:text-[#f3f6fa]'
                    }`}
                  >
                    After due date
                  </button>
                </div>
              </div>

              {/* Offset Days & Local Send Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
                    Offset (Days)
                  </label>
                  <input
                    type="number"
                    min={formTiming === 'on_due_date' ? 0 : 1}
                    max={365}
                    disabled={formTiming === 'on_due_date'}
                    value={formTiming === 'on_due_date' ? 0 : formDays}
                    onChange={(e) => setFormDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8] disabled:opacity-50"
                  />
                  <span className="text-[10px] text-[#74777d] dark:text-[#94a3b8] mt-0.5 block">
                    {formTiming === 'on_due_date'
                      ? 'Locked to 0 on due date'
                      : 'Days relative to due date'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
                    Send time
                  </label>
                  <input
                    type="time"
                    required
                    value={formSendTime}
                    onChange={(e) => setFormSendTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
                  />
                  <span className="text-[10px] text-[#74777d] dark:text-[#94a3b8] mt-0.5 block">
                    Local time in {activeTimezone}
                  </span>
                </div>
              </div>

              {/* Timezone Badge */}
              <div className="p-2.5 bg-[#f5f3ee] dark:bg-[#192638] rounded-lg flex items-center justify-between text-xs">
                <span className="text-[#44474d] dark:text-[#94a3b8] font-medium">Timezone:</span>
                <span className="font-semibold text-[#001126] dark:text-[#f3f6fa] font-['Space_Mono']">
                  {activeTimezone}
                </span>
              </div>

              {/* Tone Selection & Scope Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
                    Tone / Template
                  </label>
                  <select
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="firm">Firm (Overdue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
                    Scope
                  </label>
                  <select
                    value={formScopeInvoiceId}
                    onChange={(e) => setFormScopeInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
                  >
                    <option value="">Global (All invoices)</option>
                    {(invoices || []).filter(Boolean).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.clientName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Enable / Disable rule toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="rounded border-[#001126]/20 text-[#15263c] focus:ring-[#15263c]"
                />
                <span className="text-xs font-medium text-[#1b1c19] dark:text-[#f3f6fa]">
                  Enable this trigger immediately
                </span>
              </label>

              {formError && (
                <div className="p-2.5 bg-[#ba1a1a]/10 dark:bg-[#ba1a1a]/30 border border-[#ba1a1a]/20 rounded-lg text-xs text-[#ba1a1a] dark:text-[#ffb4ab]">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 border-t border-[#001126]/10 dark:border-white/10">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowAddModal(false)}
                  className="btn-action-secondary w-full sm:w-auto text-xs px-4 py-2.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-action-primary w-full sm:w-auto text-xs px-5 py-2.5 rounded-lg shadow-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Trigger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Email Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#001126]/10 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#001126]/10 dark:border-white/10">
              <h3 className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa]">Email Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] p-1 rounded-lg transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-2 rounded bg-[#f5f3ee] dark:bg-[#192638] text-[#001126] dark:text-[#f3f6fa]">
                <span className="text-[#44474d] dark:text-[#94a3b8] font-semibold">Subject: </span>
                {subjectLine.replace('{{invoice_number}}', invoices[0]?.invoiceNumber || 'INV-2026-001')}
              </div>
              <div className="p-4 rounded bg-[#fbf9f4] dark:bg-[#0c131d] whitespace-pre-wrap leading-relaxed text-[#1b1c19] dark:text-[#f3f6fa] border border-[#001126]/5 dark:border-white/5">
                {message
                  .replace('{{client_name}}', invoices[0]?.clientName || 'Client Name')
                  .replace('{{invoice_number}}', invoices[0]?.invoiceNumber || 'INV-2026-001')
                  .replace(
                    '{{total_amount}}',
                    formatCurrency(invoices[0]?.amount || (userPreferredCurrency === 'INR' ? 180000 : 2400), invoices[0]?.currency || userPreferredCurrency, {
                      includeDecimals: true,
                    })
                  )
                  .replace('{{due_date}}', invoices[0]?.dueDate || 'October 11, 2026')}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="btn-action-primary px-4 py-2 text-xs rounded-lg shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Reminder Sending Micro-interaction Modal */}
      {sendingState?.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (sendingState.status !== 'sending') {
              setSendingState(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#001126]/10 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <ReminderSendingAnimation
              isSuccess={sendingState.status === 'success'}
              isError={sendingState.status === 'error'}
              errorMessage={sendingState.errorMessage}
              recipientName={sendingState.recipientName}
              invoiceNumber={sendingState.invoiceNumber}
              onRetry={() => {
                if (sendingState.targetId) {
                  handleRemindNow(sendingState.targetId, sendingState.invoiceNumber, sendingState.recipientName);
                }
              }}
              onClose={() => setSendingState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
