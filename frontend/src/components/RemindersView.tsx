import React, { useState } from 'react';
import { Clock, Play, CheckCircle2, AlertCircle, RefreshCw, Send, Mail, ShieldCheck } from 'lucide-react';
import { Invoice, ReminderLog, UserProfile, ToneTemplate } from '../types';
import { getEmailTemplateContent } from '../utils/reminderEngine';

interface RemindersViewProps {
  logs: ReminderLog[];
  invoices: Invoice[];
  user: UserProfile;
  onRunScheduler: () => void;
  isSchedulerRunning?: boolean;
  onRetryFailed: (logId: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  logs,
  invoices,
  user,
  onRunScheduler,
  isSchedulerRunning,
  onRetryFailed,
}) => {
  const [selectedTone, setSelectedTone] = useState<ToneTemplate>('Gentle Creative Professional');
  const [previewStage, setPreviewStage] = useState<1 | 2 | 3 | 4>(2);
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed'>('all');

  // Sample invoice for preview
  const sampleInvoice = invoices[0] || {
    id: 'sample',
    user_id: user.id || 'usr-preview',
    invoice_number: '#INV-001',
    client_id: 'client-sample',
    client_name: 'Client / Agency Name',
    client_email: 'finance@clientfirm.in',
    amount: 25000,
    currency: 'INR',
    issue_date: '2024-10-12',
    due_date: 'October 26, 2024',
    status: 'overdue',
    reminders_enabled: true,
    tone_template: selectedTone,
    cadence_architecture: 'Active · 4-Stage Automated Reminders',
    notes: 'Brand deliverable Phase 1.',
    created_at: '2024-10-12',
    rules: [],
  };

  const previewEmail = getEmailTemplateContent(previewStage, sampleInvoice, user);

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.status === logFilter;
  });

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] tracking-tight leading-none">
            REMINDERS
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            Automated reminder schedule, delivery logs, and message templates.
          </p>
        </div>

        <button
          onClick={onRunScheduler}
          disabled={isSchedulerRunning}
          className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 sm:px-6 py-3.5 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
        >
          <Play size={14} className={isSchedulerRunning ? 'animate-spin' : ''} />
          <span>{isSchedulerRunning ? 'CHECKING REMINDERS...' : 'RUN REMINDER CHECK'}</span>
        </button>
      </div>

      {/* Cadence Architecture Overview Cards */}
      <div className="border-t border-[#e3e1ea] py-4 sm:py-6 my-4 sm:my-6">
        <div className="mb-3 sm:mb-4">
          <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
            AUTOMATED 4-STAGE REMINDER TIMELINE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Stage 1 */}
          <div className="bg-[#f4f2fc] p-4 sm:p-5 rounded-lg border border-[#e3e1ea]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#5b598b] font-bold">STAGE 01</span>
              <span className="font-mono text-xs text-[#747878]">T - 3 Days</span>
            </div>
            <h4 className="font-bold text-sm text-[#1a1b22] mb-1">Friendly Reminder</h4>
            <p className="text-xs text-[#444748] leading-relaxed">A polite reminder sent before the invoice is due.</p>
          </div>

          {/* Stage 2 */}
          <div className="bg-[#f4f2fc] p-4 sm:p-5 rounded-lg border border-[#e3e1ea]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#5b598b] font-bold">STAGE 02</span>
              <span className="font-mono text-xs text-[#747878]">T + 0 Days</span>
            </div>
            <h4 className="font-bold text-sm text-[#1a1b22] mb-1">Due Date Reminder</h4>
            <p className="text-xs text-[#444748] leading-relaxed">A reminder sent on the invoice due date.</p>
          </div>

          {/* Stage 3 */}
          <div className="bg-[#f4f2fc] p-4 sm:p-5 rounded-lg border border-[#e3e1ea]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#ba1a1a] font-bold">STAGE 03</span>
              <span className="font-mono text-xs text-[#747878]">T + 3 Days</span>
            </div>
            <h4 className="font-bold text-sm text-[#ba1a1a] mb-1">Overdue Reminder</h4>
            <p className="text-xs text-[#444748] leading-relaxed">A follow-up sent after the payment due date.</p>
          </div>

          {/* Stage 4 */}
          <div className="bg-[#f4f2fc] p-4 sm:p-5 rounded-lg border border-[#e3e1ea]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#ba1a1a] font-bold">STAGE 04</span>
              <span className="font-mono text-xs text-[#747878]">T + 7 Days</span>
            </div>
            <h4 className="font-bold text-sm text-[#ba1a1a] mb-1">Final Reminder</h4>
            <p className="text-xs text-[#444748] leading-relaxed">A final follow-up for an unpaid invoice.</p>
          </div>
        </div>
      </div>

      {/* Live Template Inspector */}
      <div className="my-8 sm:my-10 border-t border-[#e3e1ea] pt-6 sm:pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22]">
              EMAIL TEMPLATE PREVIEW
            </h3>
            <p className="text-xs text-[#747878] mt-1">Preview of automated email reminders sent to clients.</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tone Selector */}
            <div className="flex items-center bg-[#f4f2fc] p-1 rounded-md border border-[#e3e1ea] text-xs">
              {(['Gentle Creative Professional', 'Casual Friendly', 'Firm & Direct'] as ToneTemplate[]).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 rounded transition-colors text-xs font-semibold cursor-pointer active:scale-[0.98] ${
                    selectedTone === tone ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'
                  }`}
                >
                  {tone.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Stage Selector */}
            <div className="flex items-center bg-[#f4f2fc] p-1 rounded-md border border-[#e3e1ea] text-xs">
              {[1, 2, 3, 4].map((st) => (
                <button
                  key={st}
                  onClick={() => setPreviewStage(st as any)}
                  className={`px-2.5 py-1.5 min-h-[34px] sm:min-h-0 rounded transition-colors text-xs font-semibold cursor-pointer active:scale-[0.98] ${
                    previewStage === st ? 'bg-black text-white shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'
                  }`}
                >
                  Stage 0{st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rendered Email Frame */}
        <div className="bg-[#f7f7f8] p-3 sm:p-6 rounded-lg border border-[#e3e1ea]">
          <div className="bg-white rounded-lg border border-[#e3e1ea] shadow-xs overflow-hidden">
            <div className="bg-[#f8fafc] px-4 sm:px-6 py-4 border-b border-[#e2e8f0] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">To: <strong className="text-[#0f172a]">{sampleInvoice.client_email}</strong></span>
                <span className="text-[11px] font-semibold text-[#64748b]">Connected Provider (Gmail / Outlook)</span>
              </div>
              <div>
                <span className="text-[#64748b]">From: <strong className="text-[#0f172a]">{user.business_name || user.full_name || 'DueFlow'} &lt;{user.email}&gt;</strong></span>
              </div>
              <div>
                <span className="text-[#64748b]">Reply-To: <strong className="text-[#0f172a]">{user.email}</strong></span>
              </div>
              <div className="pt-1 text-sm font-semibold text-[#0f172a]">
                Subject: {previewEmail.subject}
              </div>
            </div>

            {/* Email HTML Body */}
            <div
              className="p-4 sm:p-6 text-sm"
              dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
            />
          </div>
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="my-8 sm:my-10 border-t border-[#e3e1ea] pt-6 sm:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22]">
              REMINDER DELIVERY LOGS
            </h3>
            <p className="text-xs text-[#747878] mt-1">Record of all sent reminders and delivery statuses.</p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f4f2fc] p-1 rounded-md border border-[#e3e1ea] text-xs self-start sm:self-auto">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 rounded font-semibold cursor-pointer active:scale-[0.98] ${logFilter === 'all' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'}`}
            >
              All
            </button>
            <button
              onClick={() => setLogFilter('sent')}
              className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 rounded font-semibold cursor-pointer active:scale-[0.98] ${logFilter === 'sent' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'}`}
            >
              Delivered
            </button>
            <button
              onClick={() => setLogFilter('failed')}
              className={`px-3 py-1.5 min-h-[34px] sm:min-h-0 rounded font-semibold cursor-pointer active:scale-[0.98] ${logFilter === 'failed' ? 'bg-white text-[#ba1a1a] shadow-xs' : 'text-[#747878] hover:text-[#1a1b22]'}`}
            >
              Failed
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[#e3e1ea]">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e3e1ea] text-[#747878] font-label-caps text-[11px] tracking-[0.14em]">
                <th className="py-3.5 pr-4 font-semibold uppercase">INVOICE</th>
                <th className="py-3.5 px-4 font-semibold uppercase">RECIPIENT</th>
                <th className="py-3.5 px-4 font-semibold uppercase">STAGE</th>
                <th className="py-3.5 px-4 font-semibold uppercase">DATE &amp; TIME</th>
                <th className="py-3.5 px-4 font-semibold uppercase">ID</th>
                <th className="py-3.5 px-4 font-semibold uppercase">STATUS</th>
                <th className="py-3.5 pl-4 font-semibold uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e1ea] text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f7f7f8] transition-colors">
                    <td className="py-3.5 pr-4 font-semibold text-[#1a1b22]">
                      {log.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-[#444748]">
                      {log.recipient_email}
                    </td>
                    <td className="py-3.5 px-4 text-[#1a1b22] font-medium">
                      {log.stage_name}
                    </td>
                    <td className="py-3.5 px-4 text-[#747878]">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#747878]">
                      {log.provider_message_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.status === 'sent' ? (
                        <span className="font-label-caps text-[10px] text-[#5b598b] font-bold bg-[#eeedf6] px-2 py-0.5 rounded">
                          DELIVERED
                        </span>
                      ) : (
                        <span className="font-label-caps text-[10px] text-[#ba1a1a] font-bold bg-[#ffdad6] px-2 py-0.5 rounded">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      {log.status === 'failed' && (
                        <button
                          onClick={() => onRetryFailed(log.id)}
                          className="text-xs text-[#5b598b] hover:text-[#18173a] font-semibold underline cursor-pointer"
                        >
                          Retry Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#747878]">
                    No reminder logs recorded yet. Reminders appear here once automated follow-ups are sent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
