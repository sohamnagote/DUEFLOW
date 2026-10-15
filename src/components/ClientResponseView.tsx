import React, { useState, useEffect } from 'react';
import { dueflowApi } from '../utils/api';
import { PublicInvoiceView } from '../types';
import { formatCurrency } from '../utils/currency';

export const ClientResponseView: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [invoice, setInvoice] = useState<PublicInvoiceView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected action: 'PAYMENT_REPORTED' | 'NEED_MORE_TIME' | 'QUESTION' | 'CORRECTION_REQUESTED' | null
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [idempotencyKey] = useState<string>(() => 'resp-' + Math.random().toString(36).substring(2, 15) + Date.now());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (!tokenParam) {
      setLoadError('Invalid or missing response token. Please click the response link directly from your email reminder.');
      setLoading(false);
      return;
    }
    setToken(tokenParam);
    loadInvoice(tokenParam);
  }, []);

  const loadInvoice = async (tok: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await dueflowApi.getPublicInvoice(tok);
      setInvoice(data);
    } catch (err: any) {
      console.error('Failed to load invoice details:', err);
      setLoadError(err?.message || 'Invoice response link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    if (selectedAction === 'QUESTION' && (!message || message.trim().length < 3)) {
      setSubmitError('Please enter your question before submitting.');
      return;
    }

    if (selectedAction === 'CORRECTION_REQUESTED' && (!message || message.trim().length < 3)) {
      setSubmitError('Please describe the correction needed before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await dueflowApi.submitPublicClientResponse(token, {
        responseType: selectedAction,
        responseText: message ? message.trim() : undefined,
        proposedPaymentDate: proposedDate || undefined,
        clientEmail: clientEmail ? clientEmail.trim() : undefined,
        idempotencyKey,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit client response:', err);
      setSubmitError(err?.message || 'Could not submit your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] dark:bg-[#0c131d] px-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#0891b2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#64748b] dark:text-[#94a3b8]">
            Loading invoice information…
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] dark:bg-[#0c131d] px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#121c29] border border-[#001126]/10 dark:border-white/10 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#fee2e2] dark:bg-[#7f1d1d]/30 text-[#dc2626] dark:text-[#f87171] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[24px]">link_off</span>
          </div>
          <h2 className="text-xl font-bold text-[#0f172a] dark:text-[#f8fafc]">
            Response Link Unavailable
          </h2>
          <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">
            {loadError || 'The response link is expired or invalid. If you believe this is an error, please reply directly to the reminder email.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand / Sender Header */}
        <div className="text-center space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#0891b2] dark:text-[#38bdf8]">
            Invoice Payment Response
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] dark:text-[#f8fafc] tracking-tight">
            {invoice.businessName || 'DueFlow Invoicing'}
          </h1>
          <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">
            Responding as <strong>{invoice.clientName}</strong>
          </p>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121c29] border border-[#001126]/10 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#001126]/10 dark:border-white/10">
            <div>
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8] block">Invoice</span>
              <strong className="text-base text-[#0f172a] dark:text-[#f8fafc]">
                #{invoice.invoiceNumber}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8] block">Due Date</span>
              <span className="text-sm font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                {invoice.dueDate}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-[#64748b] dark:text-[#94a3b8]">
              Total Amount Due
            </span>
            <span className="text-2xl font-bold text-[#0891b2] dark:text-[#38bdf8]">
              {formatCurrency(invoice.totalAmount, invoice.currency as any)}
            </span>
          </div>

          {/* Payment Instructions if present */}
          {invoice.paymentInstructions && (
            <div className="mt-3 p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#182638] text-xs text-[#475569] dark:text-[#cbd5e1] space-y-1 border border-[#001126]/5 dark:border-white/5">
              <strong className="block text-[#0f172a] dark:text-[#f8fafc]">Payment Notes:</strong>
              <p className="whitespace-pre-line">{invoice.paymentInstructions}</p>
            </div>
          )}
        </div>

        {/* Response Action Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121c29] border border-[#001126]/10 dark:border-white/10 shadow-md">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#ccfbf1] dark:bg-[#134e4a]/40 text-[#0f766e] dark:text-[#2dd4bf] flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-[32px]">check_circle</span>
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] dark:text-[#f8fafc]">
                Response Received
              </h3>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8] max-w-md mx-auto">
                Thank you! Your response has been securely forwarded to <strong>{invoice.businessName}</strong>. Automatic email reminders have been paused while this is reviewed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#0f172a] dark:text-[#f8fafc]">
                  Select your response:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Action 1: Payment already made */}
                  <button
                    type="button"
                    onClick={() => setSelectedAction('PAYMENT_REPORTED')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedAction === 'PAYMENT_REPORTED'
                        ? 'border-[#0891b2] bg-[#f0fdfa] dark:bg-[#134e4a]/20 dark:border-[#2dd4bf] shadow-xs'
                        : 'border-[#001126]/10 dark:border-white/10 hover:border-[#0891b2]/40 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#0d9488] dark:text-[#2dd4bf]">
                        paid
                      </span>
                      <strong className="text-sm text-[#0f172a] dark:text-[#f8fafc]">
                        Payment already made
                      </strong>
                    </div>
                    <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      I have already transferred or settled this payment.
                    </span>
                  </button>

                  {/* Action 2: Need more time */}
                  <button
                    type="button"
                    onClick={() => setSelectedAction('NEED_MORE_TIME')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedAction === 'NEED_MORE_TIME'
                        ? 'border-[#0891b2] bg-[#f0fdfa] dark:bg-[#134e4a]/20 dark:border-[#2dd4bf] shadow-xs'
                        : 'border-[#001126]/10 dark:border-white/10 hover:border-[#0891b2]/40 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#0284c7] dark:text-[#38bdf8]">
                        schedule
                      </span>
                      <strong className="text-sm text-[#0f172a] dark:text-[#f8fafc]">
                        Need more time
                      </strong>
                    </div>
                    <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      Request an extension or indicate an expected date.
                    </span>
                  </button>

                  {/* Action 3: Question about this invoice */}
                  <button
                    type="button"
                    onClick={() => setSelectedAction('QUESTION')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedAction === 'QUESTION'
                        ? 'border-[#0891b2] bg-[#f0fdfa] dark:bg-[#134e4a]/20 dark:border-[#2dd4bf] shadow-xs'
                        : 'border-[#001126]/10 dark:border-white/10 hover:border-[#0891b2]/40 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#8b5cf6] dark:text-[#a78bfa]">
                        help_outline
                      </span>
                      <strong className="text-sm text-[#0f172a] dark:text-[#f8fafc]">
                        Have a question
                      </strong>
                    </div>
                    <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      Need details, payment options, or invoice clarification.
                    </span>
                  </button>

                  {/* Action 4: Invoice correction requested */}
                  <button
                    type="button"
                    onClick={() => setSelectedAction('CORRECTION_REQUESTED')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedAction === 'CORRECTION_REQUESTED'
                        ? 'border-[#0891b2] bg-[#f0fdfa] dark:bg-[#134e4a]/20 dark:border-[#2dd4bf] shadow-xs'
                        : 'border-[#001126]/10 dark:border-white/10 hover:border-[#0891b2]/40 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#ea580c] dark:text-[#fb923c]">
                        edit_note
                      </span>
                      <strong className="text-sm text-[#0f172a] dark:text-[#f8fafc]">
                        Request correction
                      </strong>
                    </div>
                    <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      Dispute amount, billing details, or line items.
                    </span>
                  </button>
                </div>
              </div>

              {/* Action-specific fields */}
              {selectedAction && (
                <div className="space-y-4 pt-2 border-t border-[#001126]/10 dark:border-white/10 animate-fade-in">
                  {selectedAction === 'NEED_MORE_TIME' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                        Expected Payment Date (optional)
                      </label>
                      <input
                        type="date"
                        value={proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#001126]/15 dark:border-white/15 bg-white dark:bg-[#182638] text-sm text-[#0f172a] dark:text-[#f8fafc] focus:outline-hidden focus:ring-2 focus:ring-[#0891b2]"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                      {selectedAction === 'PAYMENT_REPORTED' && 'Payment reference or note (optional):'}
                      {selectedAction === 'NEED_MORE_TIME' && 'Brief reason or note (optional):'}
                      {selectedAction === 'QUESTION' && 'Your question (required):'}
                      {selectedAction === 'CORRECTION_REQUESTED' && 'Correction details (required):'}
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        selectedAction === 'PAYMENT_REPORTED'
                          ? 'e.g., Transferred via Wire / UPI reference #123456'
                          : selectedAction === 'NEED_MORE_TIME'
                          ? 'e.g., Awaiting client sign-off, will disburse next week'
                          : selectedAction === 'QUESTION'
                          ? 'e.g., Can you clarify the hourly breakdown on task #2?'
                          : 'e.g., The billing address needs to be updated to our new office'
                      }
                      maxLength={1500}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#001126]/15 dark:border-white/15 bg-white dark:bg-[#182638] text-sm text-[#0f172a] dark:text-[#f8fafc] focus:outline-hidden focus:ring-2 focus:ring-[#0891b2]"
                    />
                    <div className="text-right text-[11px] text-[#94a3b8]">
                      {message.length} / 1500
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-[#fee2e2] dark:bg-[#7f1d1d]/30 text-xs text-[#dc2626] dark:text-[#f87171]">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-[#0891b2] hover:bg-[#0e7490] text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting response…
                      </>
                    ) : (
                      'Submit Response'
                    )}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#94a3b8] dark:text-[#64748b]">
          Powered by DueFlow Invoicing &bull; Secure Client Verification
        </p>
      </div>
    </div>
  );
};
