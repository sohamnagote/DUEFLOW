import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Send, 
  ChevronDown, 
  Trash2, 
  Eye, 
  Printer, 
  FileText, 
  Zap, 
  Calendar, 
  Clock, 
  QrCode, 
  AlertCircle,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { Invoice, CadenceStage, UserProfile, DispatchChannel, IntegrationsConfig } from '../types';
import { formatINR } from '../utils/reminderEngine';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { GiveReminderModal } from './GiveReminderModal';
import { ChannelConnectModal } from './ChannelConnectModal';
import { ReminderTone } from '../utils/whatsappEngine';
import { api } from '../lib/api';

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

  // Find next scheduled reminder occurrence
  const pendingRules = (invoice.rules || []).filter(
    r => r.status === 'pending' || r.status === 'scheduled' || r.status === 'processing'
  );
  const nextReminder = pendingRules.length > 0 ? pendingRules[0] : null;

  // Find last sent or failed reminder
  const completedOrFailedRules = (invoice.rules || []).filter(
    r => r.status === 'delivered' || r.status === 'sent' || r.status === 'failed'
  );
  const lastReminder = completedOrFailedRules.length > 0
    ? completedOrFailedRules[completedOrFailedRules.length - 1]
    : null;

  // Printable / Downloadable PDF
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      // Direct link to backend real A4 PDF
      window.open(api.getInvoicePdfUrl(invoice.id), '_blank');
    } catch {
      generateInvoicePDF(invoice, user);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 600);
    }
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10 space-y-8">
      {/* 1. Top Navigation Anchor */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 font-label-caps text-[11px] uppercase text-[#747878] hover:text-[#1a1b22] transition-colors tracking-[0.14em] font-semibold cursor-pointer min-h-[44px] py-2"
        >
          <ArrowLeft size={16} />
          <span>BACK TO INVOICES</span>
        </button>
      </div>

      {/* 2. Monumental Header: Invoice Number & Amount Due */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-[#e3e1ea]">
        <div className="space-y-1">
          <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.16em] font-semibold">
            INVOICE NUMBER
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#1a1b22] leading-none tracking-tight">
            #{invoice.invoice_number.replace(/^#/, '')}
          </h1>
        </div>

        <div className="space-y-1 md:text-right">
          <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.16em] font-semibold">
            AMOUNT DUE
          </span>
          <div className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#1a1b22] leading-none tracking-tight tabular-nums">
            {formatINR(invoice.amount)}
          </div>
        </div>
      </div>

      {/* 3. Primary & Secondary Actions Bar (Part 8 Requirements) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Primary Actions Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Mark as Paid */}
          <button
            onClick={() => onTogglePaid(invoice.id)}
            className={`font-label-caps text-[11px] uppercase tracking-wider px-5 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer shadow-xs active:scale-[0.98] ${
              isPaid
                ? 'bg-[#cac6ff] text-[#18173a] hover:bg-[#b8b3fa]'
                : 'bg-black text-white hover:bg-[#1c1b1b]'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{isPaid ? 'Cleared · Mark Unpaid' : 'Mark as Paid'}</span>
          </button>

          {/* Action 2: Send Reminder */}
          {!isPaid && (
            <button
              onClick={() => {
                if (onGiveReminderNow) {
                  setShowGiveReminderModal(true);
                } else {
                  onInstantNudge(invoice);
                }
              }}
              title="Send invoice reminder email with PDF attached"
              className="bg-[#5b598b] hover:bg-[#4d4b79] text-white font-label-caps text-[11px] uppercase tracking-wider px-5 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Send size={15} />
              <span>Send Reminder</span>
            </button>
          )}

          {/* Action 3: Edit Invoice */}
          <button
            onClick={() => onEditInvoice(invoice)}
            className="bg-[#f4f2fc] hover:bg-[#e8e7f0] text-[#1a1b22] font-label-caps text-[11px] uppercase tracking-wider px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer"
          >
            Edit Invoice
          </button>

          {/* Action 4: Disable / Enable Reminders */}
          <button
            onClick={() => onToggleReminders(invoice.id)}
            className={`font-label-caps text-[11px] uppercase tracking-wider px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer border ${
              invoice.reminders_enabled
                ? 'border-[#e3e1ea] bg-white text-[#ba1a1a] hover:bg-[#fff5f5]'
                : 'border-[#5b598b] bg-[#fbf8ff] text-[#5b598b] hover:bg-[#f4f2fc]'
            }`}
          >
            {invoice.reminders_enabled ? 'Disable Reminders' : 'Enable Reminders'}
          </button>
        </div>

        {/* Secondary Actions Menu ("More") */}
        <div className="relative self-end sm:self-auto">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="font-label-caps text-[11px] uppercase text-[#747878] hover:text-[#1a1b22] bg-white border border-[#e3e1ea] px-3.5 py-3 rounded-lg transition-colors flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
          >
            <span>More</span>
            <ChevronDown size={14} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#e3e1ea] rounded-lg shadow-lg py-1.5 z-20">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  handleDownloadPdf();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} className="text-[#5b598b]" />
                <span>Download Invoice PDF</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onPreviewEmail(1, invoice);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
              >
                <Eye size={14} className="text-[#5b598b]" />
                <span>Preview Reminder Email</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  window.print();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#1a1b22] hover:bg-[#f4f2fc] flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} className="text-[#747878]" />
                <span>Print Invoice</span>
              </button>

              <div className="my-1 border-t border-[#e3e1ea]"></div>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onDeleteInvoice(invoice.id);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Invoice</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Simple, Clear Status Cards Grid (Part 8 Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Client */}
        <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-xl border border-[#e2e8f0] space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Client
          </span>
          <div className="text-sm font-bold text-[#0f172a] truncate">
            {invoice.client_name}
          </div>
          <div className="text-xs text-[#64748b] truncate">
            {invoice.client_email}
          </div>
          {invoice.client_phone && (
            <div className="text-xs text-[#64748b] truncate">
              {invoice.client_phone}
            </div>
          )}
        </div>

        {/* Card 2: Due Date & Status */}
        <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-xl border border-[#e2e8f0] space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Payment Status
          </span>
          <div className="flex items-center gap-2">
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] bg-[#ecfdf5] px-2.5 py-1 rounded">
                <CheckCircle2 size={13} />
                PAID &amp; CLEARED
              </span>
            ) : invoice.status === 'overdue' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ba1a1a] bg-[#fef2f2] px-2.5 py-1 rounded">
                <AlertCircle size={13} />
                OVERDUE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5b598b] bg-[#f4f2fc] px-2.5 py-1 rounded">
                <Clock size={13} />
                DUE SOON
              </span>
            )}
          </div>
          <div className="text-xs text-[#64748b] pt-1">
            Due on: <strong className="text-[#0f172a]">{invoice.due_date}</strong>
          </div>
        </div>

        {/* Card 3: Next Scheduled Reminder */}
        <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-xl border border-[#e2e8f0] space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Next Scheduled Reminder
          </span>
          {isPaid ? (
            <div className="text-xs text-[#64748b]">
              Cancelled (Invoice paid)
            </div>
          ) : !invoice.reminders_enabled ? (
            <div className="text-xs text-[#747878]">
              Paused (Reminders disabled)
            </div>
          ) : nextReminder ? (
            <div>
              <div className="text-xs font-bold text-[#0f172a]">
                {nextReminder.scheduled_for || 'Scheduled'}
              </div>
              <div className="text-[11px] text-[#64748b] truncate">
                Dispatches automatically via Email
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#64748b]">
              None pending
            </div>
          )}
        </div>

        {/* Card 4: Last Reminder Outcome */}
        <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-xl border border-[#e2e8f0] space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Last Reminder Outcome
          </span>
          {lastReminder ? (
            <div>
              <div className="flex items-center gap-1.5">
                {lastReminder.status === 'delivered' || lastReminder.status === 'sent' ? (
                  <span className="text-xs font-bold text-[#059669]">
                    Delivered
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#ba1a1a]">
                    Failed
                  </span>
                )}
                <span className="text-[11px] text-[#747878]">
                  · {lastReminder.scheduled_for}
                </span>
              </div>
              {lastReminder.error_message && (
                <div className="text-[11px] text-[#ba1a1a] truncate">
                  {lastReminder.error_message}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#747878]">
              No reminders sent yet
            </div>
          )}
        </div>
      </div>

      {/* 5. Clean Metadata & Payment Instructions Block */}
      <div className="bg-white rounded-xl border border-[#e3e1ea] p-6 sm:p-8 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a1b22]">
          Invoice Summary &amp; Payment Coordinates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Left: Invoice Info */}
          <div className="space-y-3 bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">Issue Date</span>
              <span className="font-semibold text-[#0f172a]">{invoice.issue_date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">Due Date</span>
              <span className="font-semibold text-[#0f172a]">{invoice.due_date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">Reminders Automation</span>
              <span className={`font-semibold ${invoice.reminders_enabled ? 'text-[#059669]' : 'text-[#747878]'}`}>
                {invoice.reminders_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {invoice.notes && (
              <div className="pt-2">
                <span className="text-[#64748b] block mb-1">Notes:</span>
                <p className="text-[#334155] leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Right: Payment Coordinates */}
          <div className="space-y-3 bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">UPI ID</span>
              <span className="font-semibold text-[#0f172a]">{user?.upi_id || 'Not configured'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">Beneficiary</span>
              <span className="font-semibold text-[#0f172a]">{user?.bank_account_name || user?.business_name || 'Not configured'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#64748b]">Bank Account</span>
              <span className="font-semibold text-[#0f172a]">
                {user?.bank_account ? `••••${user.bank_account.slice(-4)} (${user?.bank_ifsc || 'IFSC'})` : 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#64748b]">Payment QR Code</span>
              <span className={`font-semibold ${user?.payment_qr_url ? 'text-[#059669]' : 'text-[#747878]'}`}>
                {user?.payment_qr_url ? 'Attached to emails & PDF' : 'None uploaded'}
              </span>
            </div>
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
