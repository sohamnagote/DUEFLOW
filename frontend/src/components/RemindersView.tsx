import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink, 
  Eye, 
  RotateCcw, 
  Save, 
  QrCode, 
  Send,
  Calendar,
  Globe,
  Sparkles
} from 'lucide-react';
import { Invoice, ReminderLog, UserProfile } from '../types';
import { api } from '../lib/api';

export interface CustomReminderRule {
  id: string;
  direction: 'before' | 'on' | 'after';
  offset_days: number;
  send_time: string; // "10:00"
  enabled: boolean;
}

interface RemindersViewProps {
  logs: ReminderLog[];
  invoices: Invoice[];
  user: UserProfile;
  onRunScheduler: () => void;
  isSchedulerRunning?: boolean;
  onRetryFailed: (logId: string) => void;
  onNavigateToSettings?: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
}

const DEFAULT_RULES: CustomReminderRule[] = [
  { id: 'rule-1', direction: 'before', offset_days: 2, send_time: '10:00', enabled: true },
  { id: 'rule-2', direction: 'on', offset_days: 0, send_time: '09:30', enabled: true },
  { id: 'rule-3', direction: 'after', offset_days: 2, send_time: '11:00', enabled: true },
  { id: 'rule-4', direction: 'after', offset_days: 7, send_time: '10:00', enabled: true },
];

const AVAILABLE_PLACEHOLDERS = [
  { tag: '{{client_name}}', label: 'Client Name' },
  { tag: '{{invoice_number}}', label: 'Invoice #' },
  { tag: '{{invoice_amount}}', label: 'Amount' },
  { tag: '{{due_date}}', label: 'Due Date' },
  { tag: '{{business_name}}', label: 'Business Name' },
  { tag: '{{sender_name}}', label: 'Your Name' },
  { tag: '{{upi_id}}', label: 'UPI ID' },
];

export const RemindersView: React.FC<RemindersViewProps> = ({
  logs,
  invoices,
  user,
  onRunScheduler,
  isSchedulerRunning,
  onRetryFailed,
  onNavigateToSettings,
  onUpdateUser,
}) => {
  // ---------------------------------------------------------------------------
  // 1. SCHEDULE BUILDER STATE
  // ---------------------------------------------------------------------------
  const [scheduleRules, setScheduleRules] = useState<CustomReminderRule[]>(() => {
    try {
      const saved = (user as any).reminderScheduleRules || (user as any).reminder_schedule_rules;
      if (saved && typeof saved === 'string') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r, i) => ({
            id: r.id || `rule-${i + 1}`,
            direction: r.direction || 'before',
            offset_days: typeof r.offset_days === 'number' ? r.offset_days : 2,
            send_time: r.send_time || '10:00',
            enabled: r.enabled !== false,
          }));
        }
      }
    } catch {}
    return DEFAULT_RULES;
  });

  const [timezone, setTimezone] = useState<string>(() => {
    return user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  });

  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSaveMessage, setScheduleSaveMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 2. EMAIL TEMPLATE STATE
  // ---------------------------------------------------------------------------
  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
  const [customSubject, setCustomSubject] = useState<string>(
    'Payment reminder: Invoice #{{invoice_number}} | {{invoice_amount}} due {{due_date}}'
  );
  const [customBody, setCustomBody] = useState<string>(
    'This is a friendly payment reminder from {{business_name}} regarding invoice #{{invoice_number}} for {{invoice_amount}}, due on {{due_date}}.\n\nPlease find the invoice attached for your reference. Payment details are included below.'
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveMessage, setTemplateSaveMessage] = useState<string | null>(null);

  // Load template from backend on mount
  useEffect(() => {
    let isMounted = true;
    api.getReminderTemplate()
      .then((res) => {
        if (!isMounted) return;
        if (res.tone) setTone(res.tone.toLowerCase() as any);
        if (res.subject) setCustomSubject(res.subject);
        if (res.body) setCustomBody(res.body);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. LOG FILTER & PREVIEW
  // ---------------------------------------------------------------------------
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Active sample invoice for preview
  const sampleInvoice = invoices.find(inv => inv.status !== 'paid') || invoices[0] || {
    id: 'sample',
    user_id: user.id || 'usr-preview',
    invoice_number: '1000',
    client_id: 'client-sample',
    client_name: 'Mesh',
    client_email: 'mesh@example.com',
    amount: 10000,
    currency: 'INR',
    issue_date: '2026-10-01',
    due_date: '2026-10-23',
    status: 'due_soon',
    reminders_enabled: true,
    notes: 'Development deliverables Phase 1.',
    created_at: '2026-10-01',
    rules: [],
  };

  // Helper to format currency
  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amt);
  };

  // Safe placeholder interpolation for preview
  const renderPreviewText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\{\{client_name\}\}/g, sampleInvoice.client_name || 'Client')
      .replace(/\{\{invoice_number\}\}/g, sampleInvoice.invoice_number || '1000')
      .replace(/\{\{invoice_amount\}\}/g, formatAmount(sampleInvoice.amount || 10000))
      .replace(/\{\{due_date\}\}/g, sampleInvoice.due_date || '23 Oct 2026')
      .replace(/\{\{business_name\}\}/g, user.business_name || user.full_name || 'DueFlow')
      .replace(/\{\{sender_name\}\}/g, user.full_name || 'DueFlow Team')
      .replace(/\{\{upi_id\}\}/g, user.upi_id || 'Not configured');
  };

  // Insert placeholder into body textarea at cursor
  const handleInsertPlaceholder = (tag: string) => {
    if (!bodyTextareaRef.current) {
      setCustomBody((prev) => prev + ' ' + tag);
      return;
    }
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = customBody.substring(0, start) + tag + customBody.substring(end);
    setCustomBody(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // ---------------------------------------------------------------------------
  // SCHEDULE ACTIONS
  // ---------------------------------------------------------------------------
  const handleAddRule = () => {
    const newRule: CustomReminderRule = {
      id: `rule-${Date.now()}`,
      direction: 'before',
      offset_days: 1,
      send_time: '10:00',
      enabled: true,
    };
    setScheduleRules((prev) => [...prev, newRule]);
  };

  const handleUpdateRule = (id: string, updates: Partial<CustomReminderRule>) => {
    setScheduleRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleRemoveRule = (id: string) => {
    setScheduleRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setScheduleSaveMessage(null);
    try {
      await api.saveReminderSchedule({
        rules_json: JSON.stringify(scheduleRules),
        timezone,
      });
      setScheduleSaveMessage('Reminder schedule saved. Pending reminders recalculated.');
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          timezone,
          ...({ reminderScheduleRules: JSON.stringify(scheduleRules) } as any),
        });
      }
    } catch (err: any) {
      setScheduleSaveMessage(err.message || 'Failed to save reminder schedule.');
    } finally {
      setIsSavingSchedule(false);
      setTimeout(() => setScheduleSaveMessage(null), 6000);
    }
  };

  // ---------------------------------------------------------------------------
  // TEMPLATE ACTIONS
  // ---------------------------------------------------------------------------
  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    setTemplateSaveMessage(null);
    try {
      await api.saveReminderTemplate({
        tone,
        subject: customSubject,
        body: customBody,
      });
      setTemplateSaveMessage('Email template saved successfully.');
    } catch (err: any) {
      setTemplateSaveMessage(err.message || 'Failed to save email template.');
    } finally {
      setIsSavingTemplate(false);
      setTimeout(() => setTemplateSaveMessage(null), 6000);
    }
  };

  const handleResetTemplate = () => {
    if (confirm('Reset template to standard DueFlow format?')) {
      setTone('professional');
      setCustomSubject('Payment reminder: Invoice #{{invoice_number}} | {{invoice_amount}} due {{due_date}}');
      setCustomBody(
        'This is a friendly payment reminder from {{business_name}} regarding invoice #{{invoice_number}} for {{invoice_amount}}, due on {{due_date}}.\n\nPlease find the invoice attached for your reference. Payment details are included below.'
      );
    }
  };

  // Next scheduled reminder calculation preview
  const activeUnpaidCount = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.reminders_enabled !== false
  ).length;

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.status === logFilter;
  });

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10 space-y-12">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#e3e1ea]">
        <div>
          <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.16em] font-semibold">
            AUTOMATION SETTINGS
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1a1b22] tracking-tight leading-none mt-1">
            REMINDERS
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            Choose when invoice reminders are sent and what your clients receive.
          </p>
        </div>

        <button
          onClick={onRunScheduler}
          disabled={isSchedulerRunning}
          className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 sm:px-6 py-3 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
        >
          <Play size={14} className={isSchedulerRunning ? 'animate-spin' : ''} />
          <span>{isSchedulerRunning ? 'CHECKING REMINDERS...' : 'RUN REMINDER CHECK'}</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: REMINDER SCHEDULE */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white rounded-xl border border-[#e3e1ea] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#5b598b]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#1a1b22]">
                When should reminders be sent?
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#747878] mt-1">
              Customize reminder timing based on invoice due dates. Pending reminders automatically recalculate when dates change.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs bg-[#f4f2fc] px-3.5 py-2 rounded-lg border border-[#e3e1ea]">
            <Globe size={14} className="text-[#5b598b]" />
            <span className="text-[#444748] font-medium">Timezone:</span>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-white px-2 py-1 rounded border border-[#e3e1ea] font-mono text-xs text-[#1a1b22] font-semibold focus:outline-none focus:ring-1 focus:ring-[#5b598b]"
              placeholder="e.g. Asia/Kolkata"
            />
          </div>
        </div>

        {/* Schedule Rules List */}
        <div className="space-y-3 pt-2">
          {scheduleRules.map((rule, idx) => {
            const humanSummary =
              rule.direction === 'on'
                ? `On the due date at ${rule.send_time}`
                : `${rule.offset_days} day${rule.offset_days === 1 ? '' : 's'} ${rule.direction} the due date at ${rule.send_time}`;

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  rule.enabled
                    ? 'bg-[#fbf8ff] border-[#e3e1ea]'
                    : 'bg-[#f7f7f8] border-[#e3e1ea] opacity-60'
                }`}
              >
                {/* Rule Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#747878] w-6">
                    #{idx + 1}
                  </span>

                  {/* Direction Selector */}
                  <select
                    value={rule.direction}
                    onChange={(e) =>
                      handleUpdateRule(rule.id, {
                        direction: e.target.value as any,
                        offset_days: e.target.value === 'on' ? 0 : Math.max(1, rule.offset_days),
                      })
                    }
                    className="bg-white text-xs font-medium text-[#1a1b22] px-3 py-2 rounded-md border border-[#e3e1ea] focus:outline-none focus:ring-1 focus:ring-[#5b598b] cursor-pointer"
                  >
                    <option value="before">Before the due date</option>
                    <option value="on">On the due date</option>
                    <option value="after">After the due date</option>
                  </select>

                  {/* Offset Days (only if before or after) */}
                  {rule.direction !== 'on' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={rule.offset_days}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            offset_days: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-16 bg-white text-xs font-medium text-[#1a1b22] px-2.5 py-2 rounded-md border border-[#e3e1ea] text-center focus:outline-none focus:ring-1 focus:ring-[#5b598b]"
                      />
                      <span className="text-xs text-[#747878] font-medium">days</span>
                    </div>
                  )}

                  {/* Send Time Input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#747878] font-medium">at</span>
                    <input
                      type="time"
                      value={rule.send_time}
                      onChange={(e) => handleUpdateRule(rule.id, { send_time: e.target.value })}
                      className="bg-white text-xs font-medium text-[#1a1b22] px-2.5 py-2 rounded-md border border-[#e3e1ea] focus:outline-none focus:ring-1 focus:ring-[#5b598b] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#e3e1ea]">
                  <span className="text-xs text-[#5b598b] font-medium">
                    {humanSummary}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateRule(rule.id, { enabled: !rule.enabled })}
                      className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        rule.enabled
                          ? 'bg-[#5b598b] text-white'
                          : 'bg-[#e3e1ea] text-[#747878]'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Paused'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1.5 text-[#747878] hover:text-[#ba1a1a] transition-colors rounded cursor-pointer"
                      title="Remove reminder rule"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Rule & Schedule Summary */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-[#e3e1ea]">
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#e3e1ea] bg-[#f4f2fc] hover:bg-[#e8e7f0] text-xs font-bold text-[#1a1b22] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Reminder Rule</span>
          </button>

          <div className="flex items-center gap-3">
            {scheduleSaveMessage && (
              <span className="text-xs font-semibold text-[#059669]">
                {scheduleSaveMessage}
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSavingSchedule ? 'Saving...' : 'Save Schedule'}</span>
            </button>
          </div>
        </div>

        {/* Live Active Invoices Reminder Status Card */}
        <div className="bg-[#f8fafc] rounded-lg p-4 border border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-[#0f172a]">Schedule Status: </span>
            <span className="text-[#64748b]">
              {activeUnpaidCount} active unpaid invoice{activeUnpaidCount === 1 ? '' : 's'} with automated reminders enabled.
            </span>
          </div>
          <div className="text-[#64748b] text-[11px]">
            Next check will run at the configured send times in <strong className="text-[#0f172a]">{timezone}</strong>.
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: EMAIL TEMPLATE & LIVE PREVIEW */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white rounded-xl border border-[#e3e1ea] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#5b598b]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#1a1b22]">
                Email Template
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#747878] mt-1">
              Customize the message your clients receive. Dynamic placeholders automatically fill from the actual invoice.
            </p>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center bg-[#f4f2fc] p-1 rounded-lg border border-[#e3e1ea] text-xs">
            {(['friendly', 'professional', 'firm'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1.5 rounded transition-colors text-xs font-bold capitalize cursor-pointer ${
                  tone === t
                    ? 'bg-white text-[#1a1b22] shadow-xs'
                    : 'text-[#747878] hover:text-[#1a1b22]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Editor Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* Subject Input */}
            <div>
              <label className="block text-xs font-bold text-[#1a1b22] uppercase tracking-wider mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full bg-[#f8fafc] px-3.5 py-2.5 rounded-lg border border-[#e3e1ea] text-xs text-[#1a1b22] font-medium focus:outline-none focus:ring-1 focus:ring-[#5b598b]"
                placeholder="Payment reminder subject line"
              />
            </div>

            {/* Body Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1a1b22] uppercase tracking-wider">
                  Reminder Message Body
                </label>
                <span className="text-[11px] text-[#747878]">
                  Invoice table &amp; payment instructions are automatically appended
                </span>
              </div>
              <textarea
                ref={bodyTextareaRef}
                rows={5}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full bg-[#f8fafc] px-3.5 py-2.5 rounded-lg border border-[#e3e1ea] text-xs text-[#1a1b22] font-medium focus:outline-none focus:ring-1 focus:ring-[#5b598b] leading-relaxed resize-y"
                placeholder="Write your reminder message..."
              />
            </div>

            {/* Placeholder Chips */}
            <div>
              <span className="block text-[11px] font-bold text-[#747878] uppercase tracking-wider mb-2">
                Click placeholder chip to insert:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(tag)}
                    className="bg-[#f4f2fc] hover:bg-[#e8e7f0] border border-[#e3e1ea] text-[11px] text-[#5b598b] font-mono px-2.5 py-1 rounded transition-colors cursor-pointer"
                    title={`Insert ${label}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Save / Reset Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#e3e1ea]">
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-[#747878] hover:text-[#1a1b22] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Restore Default</span>
              </button>

              <div className="flex items-center gap-3">
                {templateSaveMessage && (
                  <span className="text-xs font-semibold text-[#059669]">
                    {templateSaveMessage}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSavingTemplate ? 'Saving...' : 'Save Template'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 bg-[#f7f7f8] p-4 sm:p-5 rounded-xl border border-[#e3e1ea] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-[#5b598b]" />
                <span className="text-xs font-bold text-[#1a1b22] uppercase tracking-wider">
                  Live Email Preview
                </span>
              </div>

              {/* Preview PDF Button */}
              {sampleInvoice.id && (
                <a
                  href={api.getInvoicePdfUrl(sampleInvoice.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#5b598b] hover:text-[#18173a] flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded border border-[#e3e1ea] shadow-xs"
                >
                  <FileText size={12} />
                  <span>Preview Invoice PDF</span>
                </a>
              )}
            </div>

            {/* Mock Email Window */}
            <div className="bg-white rounded-lg border border-[#e3e1ea] shadow-xs overflow-hidden text-xs">
              {/* Email Headers */}
              <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] space-y-1">
                <div>
                  <span className="text-[#64748b]">To: </span>
                  <strong className="text-[#0f172a]">{sampleInvoice.client_email}</strong>
                </div>
                <div>
                  <span className="text-[#64748b]">From: </span>
                  <strong className="text-[#0f172a]">
                    {user.business_name || user.full_name || 'DueFlow'} &lt;{user.email || 'user@gmail.com'}&gt;
                  </strong>
                </div>
                <div className="pt-1 text-xs font-bold text-[#0f172a]">
                  Subject: {renderPreviewText(customSubject)}
                </div>
              </div>

              {/* Email Content Frame */}
              <div className="p-5 space-y-4 text-[#1a1b22] leading-relaxed font-sans">
                {/* Single Greeting */}
                <p className="font-semibold text-sm">
                  Hi {sampleInvoice.client_name || 'Client'},
                </p>

                {/* Body Message */}
                <div className="whitespace-pre-line text-xs text-[#334155]">
                  {renderPreviewText(customBody)}
                </div>

                {/* Professional Invoice Summary Table */}
                <div className="my-4 border border-[#e2e8f0] rounded-md overflow-hidden">
                  <div className="bg-[#f1f5f9] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    Invoice Summary
                  </div>
                  <div className="divide-y divide-[#e2e8f0] text-xs">
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-[#64748b]">Invoice Number</span>
                      <span className="font-semibold text-[#0f172a]">#{sampleInvoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-[#64748b]">Issue Date</span>
                      <span className="text-[#0f172a]">{sampleInvoice.issue_date}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-[#64748b]">Due Date</span>
                      <span className="font-semibold text-[#0f172a]">{sampleInvoice.due_date}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-[#f8fafc]">
                      <span className="font-bold text-[#0f172a]">Amount Due</span>
                      <span className="font-bold text-sm text-[#0f172a]">{formatAmount(sampleInvoice.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Coordinates Card */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    Payment Details
                  </div>
                  <div className="space-y-1 text-xs text-[#334155]">
                    {user.upi_id && (
                      <div>UPI ID: <strong className="text-[#0f172a]">{user.upi_id}</strong></div>
                    )}
                    {user.bank_account_name && (
                      <div>Beneficiary: <strong className="text-[#0f172a]">{user.bank_account_name}</strong></div>
                    )}
                    {user.bank_account && (
                      <div>Account: <strong className="text-[#0f172a]">{user.bank_account}</strong></div>
                    )}
                    {user.bank_ifsc && (
                      <div>IFSC: <strong className="text-[#0f172a]">{user.bank_ifsc}</strong></div>
                    )}
                  </div>

                  {/* Payment QR Thumbnail if uploaded */}
                  {user.payment_qr_url && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[#e2e8f0]">
                      <img
                        src={user.payment_qr_url}
                        alt="Payment QR"
                        className="w-14 h-14 object-contain rounded border border-[#cbd5e1] bg-white p-1"
                      />
                      <div className="text-[11px] text-[#64748b]">
                        Scan with any UPI app to pay directly.
                      </div>
                    </div>
                  )}
                </div>

                {/* Closing & Attachment Badge */}
                <div className="pt-3 border-t border-[#e2e8f0] text-xs text-[#64748b] space-y-2">
                  <p>
                    Please arrange payment at your convenience. If you have already made payment, kindly disregard this reminder.
                  </p>
                  <div>
                    Regards,<br />
                    <strong className="text-[#0f172a]">{user.full_name || 'DueFlow'}</strong><br />
                    {user.business_name && <span>{user.business_name}</span>}
                  </div>

                  <div className="pt-2 flex items-center gap-2 text-[11px] font-semibold text-[#5b598b] bg-[#f4f2fc] px-2.5 py-1.5 rounded">
                    <FileText size={13} />
                    <span>Attached: Invoice-{sampleInvoice.invoice_number}.pdf (Real A4 PDF)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: PAYMENT DETAILS SUMMARY */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white rounded-xl border border-[#e3e1ea] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-[#5b598b]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#1a1b22]">
                Payment Details &amp; QR
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#747878] mt-1">
              Payment coordinates attached to your automated reminder emails and invoice PDFs.
            </p>
          </div>

          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5b598b] hover:text-[#18173a] hover:underline cursor-pointer"
            >
              <span>Edit in Settings</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
              Business / Freelancer
            </span>
            <div className="text-sm font-bold text-[#0f172a] truncate">
              {user.business_name || user.full_name || 'Not configured'}
            </div>
          </div>

          <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
              UPI ID
            </span>
            <div className="text-sm font-bold text-[#0f172a] truncate">
              {user.upi_id || 'Not configured'}
            </div>
          </div>

          <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
              Bank Account
            </span>
            <div className="text-sm font-bold text-[#0f172a] truncate">
              {user.bank_account ? `••••${user.bank_account.slice(-4)} (${user.bank_ifsc || 'IFSC'})` : 'Not configured'}
            </div>
          </div>

          <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
              Payment QR Code
            </span>
            <div className="flex items-center gap-2">
              {user.payment_qr_url ? (
                <>
                  <CheckCircle2 size={16} className="text-[#059669]" />
                  <span className="text-xs font-bold text-[#059669]">Uploaded &amp; Active</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-[#747878]" />
                  <span className="text-xs font-medium text-[#747878]">None Uploaded</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4: REMINDER HISTORY */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white rounded-xl border border-[#e3e1ea] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#5b598b]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#1a1b22]">
                Reminder History
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#747878] mt-1">
              Audit log of dispatched invoice reminder emails.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#f4f2fc] p-1 rounded-lg border border-[#e3e1ea] text-xs">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                logFilter === 'all' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLogFilter('sent')}
              className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                logFilter === 'sent' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setLogFilter('failed')}
              className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                logFilter === 'failed' ? 'bg-white text-[#ba1a1a] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto border-t border-[#e3e1ea] pt-3">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e3e1ea] text-[#747878] font-label-caps text-[11px] tracking-[0.14em]">
                <th className="py-3.5 pr-4 font-semibold uppercase">INVOICE</th>
                <th className="py-3.5 px-4 font-semibold uppercase">RECIPIENT</th>
                <th className="py-3.5 px-4 font-semibold uppercase">DATE &amp; TIME</th>
                <th className="py-3.5 px-4 font-semibold uppercase">OUTCOME</th>
                <th className="py-3.5 px-4 font-semibold uppercase">DETAILS</th>
                <th className="py-3.5 pl-4 font-semibold uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e1ea] text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f7f7f8] transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-[#1a1b22]">
                      {log.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-[#444748]">
                      {log.recipient_email}
                    </td>
                    <td className="py-3.5 px-4 text-[#747878]">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.status === 'sent' ? (
                        <span className="font-label-caps text-[10px] text-[#059669] font-bold bg-[#ecfdf5] px-2 py-0.5 rounded">
                          ACCEPTED
                        </span>
                      ) : (
                        <span className="font-label-caps text-[10px] text-[#ba1a1a] font-bold bg-[#ffdad6] px-2 py-0.5 rounded">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#747878] max-w-xs truncate">
                      {log.details || log.provider_message_id || 'Dispatched via connected provider'}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      {log.status === 'failed' && (
                        <button
                          onClick={() => onRetryFailed(log.id)}
                          className="text-xs text-[#5b598b] hover:text-[#18173a] font-bold underline cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#747878]">
                    No reminder logs recorded yet. Reminders will appear here once dispatched.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
