import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Send, ChevronDown, Trash2, Eye, Printer, FileText, Zap, MessageSquare, ArrowRight } from 'lucide-react';
import { Invoice, CadenceStage, UserProfile, DispatchChannel, IntegrationsConfig } from '../types';
import { formatINR } from '../utils/reminderEngine';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { GiveReminderModal } from './GiveReminderModal';
import { ChannelConnectModal } from './ChannelConnectModal';
import { ReminderTone } from '../utils/whatsappEngine';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  onBack: () => void;
  onTogglePaid: (invoiceId: string) => void;
  onInstantNudge: (invoice: Invoice) => void;
  onGiveReminderNow?: (
    invoice: Invoice,
    channel: DispatchChannel,
    clientPhone: string,
    tone: ReminderTone,
    customMessage?: string
  ) => void;
  onToggleReminders: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onPreviewEmail: (stage: CadenceStage, invoice: Invoice) => void;
  onSaveIntegrations?: (config: IntegrationsConfig) => void;
  user?: UserProfile;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({
  invoice,
  onBack,
  onTogglePaid,
  onInstantNudge,
  onGiveReminderNow,
  onToggleReminders,
  onEditInvoice,
  onDeleteInvoice,
  onPreviewEmail,
  onSaveIntegrations,
  user,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showGiveReminderModal, setShowGiveReminderModal] = useState(false);
  const [showChannelConnectModal, setShowChannelConnectModal] = useState(false);
  const isPaid = invoice.status === 'paid';

  // Generate printable PDF summary
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    try {
      generateInvoicePDF(invoice, user);
    } catch (err) {
      console.error('PDF generation error, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 800);
    }
  };

  // Calculate executed stages
  const executedCount = invoice.rules.filter((r) => r.status === 'delivered' || r.status === 'sent').length;
  const totalStages = Math.max(invoice.rules.length, 4);

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* 1. Top Navigation Anchor */}
      <div className="w-full mb-6 sm:mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 font-label-caps text-[11px] uppercase text-[#747878] hover:text-[#1a1b22] transition-colors tracking-[0.14em] font-semibold cursor-pointer min-h-[44px] py-2"
        >
          <ArrowLeft size={16} />
          <span>BACK TO INVOICES</span>
        </button>
      </div>

      {/* 2. Primary Invoice Identity (Monumental Editorial Header) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.16em] font-semibold">
            INVOICE NUMBER
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] leading-none tracking-tight break-all sm:break-normal">
            {invoice.invoice_number}
          </h1>
        </div>

        <div className="space-y-1 md:text-right">
          <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.16em] font-semibold">
            TOTAL AMOUNT
          </span>
          <div className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] leading-none tracking-tight tabular-nums">
            {formatINR(invoice.amount)}
          </div>
        </div>
      </div>

      {/* Status Metadata Sub-line */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-4 font-label-caps text-[11px] uppercase tracking-[0.16em]">
        {invoice.status === 'overdue' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-[#ba1a1a]">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            OVERDUE · 3 DAYS
          </span>
        )}
        {invoice.status === 'due_soon' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-[#5b598b]">
            <span className="w-2 h-2 rounded-full bg-[#5b598b]"></span>
            DUE SOON
          </span>
        )}
        {invoice.status === 'paid' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-[#5b598b]">
            <span className="w-2 h-2 rounded-full bg-[#5b598b]"></span>
            CLEARED · PAID
          </span>
        )}
        {invoice.status === 'scheduled' && (
          <span className="inline-flex items-center gap-1.5 font-medium text-[#747878]">
            <span className="w-2 h-2 rounded-full bg-[#c4c7c7]"></span>
            SCHEDULED IN ADVANCE
          </span>
        )}

        <span className="text-[#dad9e2]">/</span>

        <span className={`inline-flex items-center gap-1.5 font-medium ${
          invoice.reminders_enabled ? 'text-[#5b598b]' : 'text-[#747878]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            invoice.reminders_enabled ? 'bg-[#5b598b]' : 'bg-[#c4c7c7]'
          }`}></span>
          {invoice.reminders_enabled ? 'Automated reminders active' : 'Reminders paused'}
        </span>

        <span className="text-[#dad9e2]">/</span>
        <span className="text-[#747878] text-[11px]">
          Client: {invoice.client_name}
        </span>
      </div>

      {/* 3. Primary & Secondary Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 sm:mt-8 pb-4 border-b border-[#e3e1ea]/70">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => onTogglePaid(invoice.id)}
            className={`font-label-caps text-[11px] uppercase tracking-wider px-6 py-3.5 min-h-[44px] rounded-lg transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.98] ${
              isPaid
                ? 'bg-[#cac6ff] text-[#18173a] hover:bg-[#b8b3fa]'
                : 'bg-black text-white hover:bg-[#1c1b1b]'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{isPaid ? 'Cleared · Mark Unpaid' : 'Mark as Paid'}</span>
          </button>

          {/* Give Reminder Now (Prominent Execution Button) */}
          {!isPaid && (
            <button
              onClick={() => setShowGiveReminderModal(true)}
              title="Send payment reminder now via Email & WhatsApp"
              className="bg-[#5b598b] hover:bg-[#4d4b79] text-white font-label-caps text-[11px] uppercase tracking-wider px-6 py-3.5 min-h-[44px] rounded-lg transition-all flex items-center justify-center gap-2 font-bold cursor-pointer active:scale-[0.98] shadow-xs"
            >
              <Zap size={16} />
              <span>Give Reminder Now</span>
            </button>
          )}

          {!isPaid && (
            <button
              onClick={() => onInstantNudge(invoice)}
              className="bg-[#f4f2fc] hover:bg-[#e8e7f0] text-[#1a1b22] font-label-caps text-[11px] uppercase tracking-wider px-4 py-3.5 min-h-[44px] rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.98]"
            >
              <Send size={15} />
              <span>Quick Nudge</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Printable Invoice Summary Button */}
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            title="Generate & download printable PDF invoice summary"
            className="font-label-caps text-[11px] uppercase text-[#1a1b22] hover:text-[#5b598b] bg-[#f4f2fc] hover:bg-[#e8e7f0] border border-[#e3e1ea] px-3.5 py-2 min-h-[38px] rounded-md transition-colors flex items-center gap-1.5 font-semibold cursor-pointer active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            <Printer size={14} className={isGeneratingPdf ? 'animate-spin text-[#5b598b]' : ''} />
            <span>{isGeneratingPdf ? 'Generating...' : 'Print / PDF'}</span>
          </button>

          <button
            onClick={() => onEditInvoice(invoice)}
            className="font-label-caps text-[11px] uppercase text-[#747878] hover:text-[#1a1b22] px-3 py-2 min-h-[38px] rounded transition-colors font-semibold cursor-pointer shrink-0"
          >
            Edit
          </button>

          <button
            onClick={() => onToggleReminders(invoice.id)}
            className={`font-label-caps text-[11px] uppercase px-3 py-2 min-h-[38px] rounded transition-colors font-semibold cursor-pointer shrink-0 ${
              invoice.reminders_enabled
                ? 'text-[#747878] hover:text-[#ba1a1a]'
                : 'text-[#5b598b] hover:text-[#18173a]'
            }`}
          >
            {invoice.reminders_enabled ? 'Disable Reminders' : 'Resume Cadence'}
          </button>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="font-label-caps text-[11px] uppercase text-[#747878] hover:text-[#1a1b22] px-3 py-2 min-h-[38px] rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>More</span>
              <ChevronDown size={14} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#e3e1ea] rounded-md shadow-md py-1 z-20">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleGeneratePdf();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={13} />
                  <span>Download PDF Summary</span>
                </button>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    window.print();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Browser Print (System)</span>
                </button>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onPreviewEmail(1, invoice);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Preview Reminders</span>
                </button>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onDeleteInvoice(invoice.id);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/30 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel Delivery Status & Connect Bar */}
      {!isPaid && (
        <div className="mt-4 p-3.5 rounded-lg bg-[#fbf8ff] border border-[#cac6ff]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="font-label-caps text-[10px] text-[#747878] uppercase font-bold tracking-wider">
              Reminder Channels:
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#5b598b]">
              <span className="w-2 h-2 rounded-full bg-[#5b598b]"></span>
              Email: {invoice.client_email}
            </span>
            <span className="text-[#dad9e2]">/</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold ${
              invoice.client_phone ? 'text-[#059669]' : 'text-[#747878]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                invoice.client_phone ? 'bg-[#059669]' : 'bg-[#c4c7c7]'
              }`}></span>
              WhatsApp: {invoice.client_phone || 'No phone attached'}
            </span>
          </div>

          <button
            onClick={() => setShowChannelConnectModal(true)}
            className="text-[11px] font-bold text-[#5b598b] hover:text-[#18173a] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Connect Email &amp; WhatsApp Channels</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* 4. Metadata Ledger Section */}
      <div className="bg-[#f4f2fc] px-4 sm:px-6 py-6 sm:py-8 my-6 rounded-lg border border-[#e3e1ea]/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-5 sm:gap-y-6 gap-x-6 sm:gap-x-8">
          {/* Client */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Client
            </span>
            <span className="text-[#1a1b22] font-semibold text-sm">
              {invoice.client_name}
            </span>
            {invoice.client_cin && (
              <span className="font-label-num text-[12px] text-[#747878]">
                CIN: {invoice.client_cin}
              </span>
            )}
          </div>

          {/* Primary Email */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Recipient Email
            </span>
            <span className="text-[#1a1b22] text-sm">
              {invoice.client_email}
            </span>
            {invoice.client_attn && (
              <span className="font-label-num text-[12px] text-[#747878]">
                Attn: {invoice.client_attn}
              </span>
            )}
          </div>

          {/* Issue Date */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Issue Date
            </span>
            <span className="text-[#1a1b22] text-sm font-medium">
              {invoice.issue_date}
            </span>
          </div>

          {/* Due Date */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Due Date
            </span>
            <span className={`text-sm font-semibold ${
              invoice.status === 'overdue' ? 'text-[#ba1a1a]' : 'text-[#1a1b22]'
            }`}>
              {invoice.due_date}
            </span>
          </div>

          {/* Tone Template */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Tone of Voice
            </span>
            <span className="text-[#444748] text-sm font-medium">
              {invoice.tone_template}
            </span>
          </div>

          {/* Cadence Architecture */}
          <div className="flex flex-col space-y-1">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold">
              Reminder Schedule
            </span>
            <span className="text-[#5b598b] text-sm font-semibold">
              {invoice.cadence_architecture || 'Active · 4-Stage Automated Reminders'}
            </span>
            <span className="font-label-num text-[12px] text-[#747878]">
              Channel: Email &amp; WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* 5. Lower Ledger: Cadence Timeline & Settlement Memorandum */}
      <div className="mt-12 pt-8 border-t border-[#e3e1ea] grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <span className="font-label-caps text-[11px] uppercase text-[#1a1b22] font-bold tracking-[0.16em]">
              REMINDER TIMELINE
            </span>
            <span className="font-label-num text-[12px] text-[#747878]">
              {executedCount} of {totalStages} reminders sent
            </span>
          </div>

          {/* Timeline Container with Editorial Vertical Axis */}
          <div className="relative pl-8 space-y-8">
            {/* Vertical Guide Line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-[#e3e1ea]"></div>

            {invoice.rules.map((rule) => {
              const isDelivered = rule.status === 'delivered';
              const isSent = rule.status === 'sent';
              const isFailed = rule.status === 'failed';
              const isSkipped = rule.status === 'skipped';
              const isProcessing = rule.status === 'processing' || rule.status === 'sending';
              const isCompleted = isDelivered || isSent;
              const isStage3Active = rule.stage_number === 3 && isCompleted;

              const getStatusBadge = () => {
                if (isDelivered) return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#1a1b22]">● DELIVERED</span>;
                if (isSent) return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#1a1b22]">● SENT</span>;
                if (isProcessing) return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#5b598b] animate-pulse">◌ SENDING</span>;
                if (isFailed) return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#ba1a1a]">⚠ FAILED</span>;
                if (isSkipped) return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#747878]">— SKIPPED</span>;
                return <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold text-[#747878]">○ SCHEDULED</span>;
              };

              return (
                <div
                  key={rule.id}
                  className={`relative flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 group ${
                    !isCompleted && !isProcessing && !isFailed ? 'opacity-70' : ''
                  }`}
                >
                  {/* Node indicator */}
                  <div className="absolute -left-[30px] top-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    {isStage3Active ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5b598b] ring-4 ring-[#cac6ff]"></div>
                    ) : isDelivered || isSent ? (
                      <div className="w-2 h-2 rounded-full bg-[#1a1b22]"></div>
                    ) : isFailed ? (
                      <div className="w-2 h-2 rounded-full bg-[#ba1a1a]"></div>
                    ) : isProcessing ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5b598b] animate-ping"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#e3e1ea]"></div>
                    )}
                  </div>

                  {/* Stage info */}
                  <div className="flex flex-col space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-label-caps text-[11px] uppercase tracking-wider font-semibold ${
                        isStage3Active ? 'text-[#5b598b]' : isCompleted ? 'text-[#1a1b22]' : isFailed ? 'text-[#ba1a1a]' : 'text-[#747878]'
                      }`}>
                        {rule.stage_label}
                      </span>
                      <span className="font-label-num text-[12px] text-[#747878]">
                        · {rule.scheduled_for}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      isStage3Active ? 'text-[#1a1b22] font-semibold' : isCompleted ? 'text-[#1a1b22]' : isFailed ? 'text-[#ba1a1a]' : 'text-[#747878]'
                    }`}>
                      &ldquo;{rule.subject_line}&rdquo;
                    </p>
                    {isFailed && rule.error_message && (
                      <p className="text-[11px] text-[#ba1a1a] mt-0.5">
                        Error: {rule.error_message}
                      </p>
                    )}
                  </div>

                  {/* Action & Status */}
                  <div className="flex items-center gap-2.5 sm:gap-3 sm:text-right pt-2 sm:pt-0 shrink-0">
                    <button
                      onClick={() => onPreviewEmail(rule.stage_number, invoice)}
                      className="text-xs text-[#5b598b] hover:text-[#18173a] px-2.5 py-1.5 min-h-[34px] bg-[#f4f2fc] hover:bg-[#e8e7f0] rounded-md font-semibold cursor-pointer transition-colors active:scale-[0.98]"
                    >
                      Preview Email
                    </button>
                    {getStatusBadge()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Payment Details & Notes */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#fbf8ff] p-6 rounded-lg border border-[#e3e1ea] space-y-4">
            <span className="font-label-caps text-[11px] uppercase text-[#1a1b22] font-bold tracking-[0.16em] block">
              PAYMENT DETAILS
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#e3e1ea]">
                <span className="text-[#747878]">Currency</span>
                <span className="font-semibold text-[#1a1b22]">INR (Indian Rupee)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#e3e1ea]">
                <span className="text-[#747878]">Payment Method</span>
                <span className="font-semibold text-[#5b598b]">Direct Bank / UPI</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#747878]">Reminders</span>
                <span className={`font-semibold ${invoice.reminders_enabled ? 'text-[#5b598b]' : 'text-[#747878]'}`}>
                  {invoice.reminders_enabled ? 'Active 4-Stage Cadence' : 'Reminders Paused'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[#e3e1ea] space-y-2">
            <span className="font-label-caps text-[11px] uppercase text-[#747878] font-bold tracking-[0.14em] block">
              INVOICE NOTES
            </span>
            <p className="text-xs text-[#444748] leading-relaxed">
              {invoice.notes || 'No extra notes recorded for this invoice.'}
            </p>
          </div>
        </div>
      </div>

      {/* Give Reminder Now Modal */}
      {showGiveReminderModal && user && (
        <GiveReminderModal
          isOpen={showGiveReminderModal}
          onClose={() => setShowGiveReminderModal(false)}
          invoice={invoice}
          user={user}
          onExecuteReminder={(inv, channel, phone, tone, customMsg) => {
            if (onGiveReminderNow) {
              onGiveReminderNow(inv, channel, phone, tone, customMsg);
            } else {
              onInstantNudge(inv);
            }
          }}
          onOpenConnectChannels={() => {
            setShowGiveReminderModal(false);
            setShowChannelConnectModal(true);
          }}
        />
      )}

      {/* Channel Integrations Modal */}
      {showChannelConnectModal && user && (
        <ChannelConnectModal
          isOpen={showChannelConnectModal}
          onClose={() => setShowChannelConnectModal(false)}
          user={user}
          onSaveIntegrations={(cfg?: any) => {
            if (onSaveIntegrations && cfg) onSaveIntegrations(cfg);
          }}
        />
      )}
    </div>
  );
};
