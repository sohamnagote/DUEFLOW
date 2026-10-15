import React, { useState, useEffect } from 'react';
import { Invoice, ClientResponse } from '../types';
import { dueflowApi } from '../utils/api';
import { formatCurrency } from '../utils/currency';

interface ClientReplyReviewModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onInvoiceUpdated?: (updated: Invoice) => void;
  onMarkPaid?: (invoiceId: string) => void;
}

export const ClientReplyReviewModal: React.FC<ClientReplyReviewModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onInvoiceUpdated,
  onMarkPaid,
}) => {
  const [responses, setResponses] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      loadResponses(invoice.id);
    } else {
      setResponses([]);
      setActionMessage(null);
    }
  }, [isOpen, invoice?.id]);

  const loadResponses = async (invId: string) => {
    setLoading(true);
    try {
      const data = await dueflowApi.getInvoiceResponses(invId);
      setResponses(data);
    } catch (err) {
      console.error('Failed to load client responses for invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  const handleResume = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await dueflowApi.resumeFollowUp(invoice.id);
      setActionMessage('Follow-up sequence resumed. Next eligible reminders recalculated.');
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updated);
      }
    } catch (err: any) {
      console.error('Failed to resume follow-up:', err);
      setActionMessage(err?.message || 'Failed to resume follow-up.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await dueflowApi.pauseFollowUp(invoice.id);
      setActionMessage('Follow-up reminders paused.');
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updated);
      }
    } catch (err: any) {
      console.error('Failed to pause follow-up:', err);
      setActionMessage(err?.message || 'Failed to pause follow-up.');
    } finally {
      setActionLoading(false);
    }
  };

  const classification = invoice.lastReplyClassification || invoice.last_reply_classification || 'REVIEW_NEEDED';
  const snippet = invoice.lastReplySnippet || invoice.last_reply_snippet;
  const replyAt = invoice.lastReplyAt || invoice.last_reply_at;
  const followUpStatus = invoice.followUpStatus || invoice.follow_up_status || 'ACTIVE';

  const formatClassification = (cls: string) => {
    switch (cls) {
      case 'PAYMENT_REPORTED':
        return { label: 'Payment Reported', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
      case 'NEED_MORE_TIME':
        return { label: 'Need More Time', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800' };
      case 'QUESTION':
        return { label: 'Question Asked', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
      case 'CORRECTION_REQUESTED':
        return { label: 'Correction Requested', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
      case 'OUT_OF_OFFICE':
        return { label: 'Out of Office', color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700' };
      default:
        return { label: cls.replace(/_/g, ' '), color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' };
    }
  };

  const badgeInfo = formatClassification(classification);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001126]/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121c29] border border-[#001126]/10 dark:border-white/10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#001126]/10 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeInfo.color}`}>
                {badgeInfo.label}
              </span>
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Status: <strong className="text-[#0f172a] dark:text-[#f8fafc]">{followUpStatus}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#0f172a] dark:text-[#f8fafc]">
              Client Response &bull; #{invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              Client: <strong>{invoice.clientName}</strong> ({invoice.clientEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f8fafc] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Invoice Brief */}
        <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#182638] flex items-center justify-between text-xs border border-[#001126]/5 dark:border-white/5">
          <div>
            <span className="text-[#64748b] dark:text-[#94a3b8] block">Due Date</span>
            <strong className="text-[#0f172a] dark:text-[#f8fafc]">{invoice.dueDate}</strong>
          </div>
          <div className="text-right">
            <span className="text-[#64748b] dark:text-[#94a3b8] block">Outstanding Amount</span>
            <strong className="text-sm font-bold text-[#0891b2] dark:text-[#38bdf8]">
              {formatCurrency(invoice.amount, invoice.currency as any)}
            </strong>
          </div>
        </div>

        {/* Latest Reply Details */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc] block">
            Latest Client Message
          </span>
          <div className="p-4 rounded-2xl bg-[#fbf9f4] dark:bg-[#0c131d] border border-[#001126]/10 dark:border-white/10 text-sm text-[#334155] dark:text-[#cbd5e1] leading-relaxed">
            {snippet ? (
              <p className="whitespace-pre-line">{snippet}</p>
            ) : (
              <p className="italic text-[#94a3b8]">No message content recorded.</p>
            )}
            {replyAt && (
              <span className="block mt-2 text-[11px] text-[#94a3b8]">
                Received: {new Date(replyAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* History of One-Click Responses if any */}
        {responses.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc] block">
              Previous Response Submissions ({responses.length})
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {responses.map((resp) => (
                <div
                  key={resp.id}
                  className="p-3 rounded-xl border border-[#001126]/5 dark:border-white/5 bg-white dark:bg-[#182638] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[#0f172a] dark:text-[#f8fafc]">
                      {resp.responseType.replace(/_/g, ' ')}
                    </strong>
                    <span className="text-[10px] text-[#94a3b8]">
                      {new Date(resp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {resp.proposedPaymentDate && (
                    <span className="text-[#0891b2] dark:text-[#38bdf8] block font-medium">
                      Expected payment date: {resp.proposedPaymentDate}
                    </span>
                  )}
                  {resp.responseText && (
                    <p className="text-[#64748b] dark:text-[#94a3b8]">{resp.responseText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {actionMessage && (
          <div className="p-3 rounded-xl bg-[#ecfeff] dark:bg-[#164e63]/30 border border-[#a5f3fc] dark:border-[#0891b2]/40 text-xs text-[#0891b2] dark:text-[#38bdf8]">
            {actionMessage}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#001126]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onMarkPaid && invoice.status !== 'paid' && (
              <button
                type="button"
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white transition-colors"
              >
                Mark Invoice Paid
              </button>
            )}
            {followUpStatus === 'PAUSED_FOR_REVIEW' || followUpStatus === 'PAUSED_BY_USER' || followUpStatus === 'CLIENT_REPLIED' ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleResume}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Resuming…' : 'Resume Follow-ups'}
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePause}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Pausing…' : 'Pause Follow-ups'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-[#001126]/10 dark:border-white/10 text-[#64748b] dark:text-[#94a3b8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
