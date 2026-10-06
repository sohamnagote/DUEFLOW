import React, { useState } from 'react';
import { X, Mail, MessageSquare, Send, CheckCircle2, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Invoice, UserProfile, DispatchChannel } from '../types';
import { formatINR, getEmailTemplateContent } from '../utils/reminderEngine';
import { generateWhatsAppReminderMessage, buildWhatsAppUrl, ReminderTone } from '../utils/whatsappEngine';

interface GiveReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  user: UserProfile;
  onExecuteReminder: (
    invoice: Invoice,
    channel: DispatchChannel,
    clientPhone: string,
    tone: ReminderTone,
    customMessage?: string
  ) => void;
  onOpenConnectChannels?: () => void;
}

export const GiveReminderModal: React.FC<GiveReminderModalProps> = ({
  isOpen,
  onClose,
  invoice,
  user,
  onExecuteReminder,
  onOpenConnectChannels,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<DispatchChannel>('both');
  const [tone, setTone] = useState<ReminderTone>('professional');
  const [clientPhone, setClientPhone] = useState(invoice.client_phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewTab, setShowPreviewTab] = useState<'whatsapp' | 'email'>('whatsapp');

  if (!isOpen) return null;

  // Next pending rule stage
  const pendingRule = invoice.rules.find((r) => r.status === 'scheduled') || invoice.rules[0];
  const stageNumber = pendingRule ? pendingRule.stage_number : 2;

  // Pre-generate copies
  const emailContent = getEmailTemplateContent(stageNumber, invoice, user);
  const whatsappContent = generateWhatsAppReminderMessage(invoice, user, tone);
  const whatsappUrl = buildWhatsAppUrl(clientPhone, whatsappContent);

  const handleExecute = () => {
    setIsSubmitting(true);
    try {
      onExecuteReminder(invoice, selectedChannel, clientPhone, tone, whatsappContent);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const isWhatsAppSelected = selectedChannel === 'whatsapp' || selectedChannel === 'both';
  const isEmailSelected = selectedChannel === 'email' || selectedChannel === 'both';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e3e1ea]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#f4f2fc] text-[#5b598b] flex items-center justify-center font-bold">
              <Send size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1a1b22] tracking-tight">
                Send Reminder Now
              </h2>
              <p className="text-xs text-[#747878]">
                Instant reminder for {invoice.invoice_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoice Mini Card */}
        <div className="my-4 p-3.5 bg-[#f4f2fc] rounded-lg flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#747878] block">Client Recipient</span>
            <span className="font-bold text-[#1a1b22] text-sm">{invoice.client_name}</span>
            <span className="text-[#5b598b] block">{invoice.client_email}</span>
          </div>
          <div className="text-right">
            <span className="text-[#747878] block">Amount Due</span>
            <span className="font-extrabold text-[#1a1b22] text-sm tabular-nums">
              {formatINR(invoice.amount)}
            </span>
            <span className="text-[#ba1a1a] block font-semibold">Due {invoice.due_date}</span>
          </div>
        </div>

        {/* 1. Channel Selection */}
        <div className="space-y-2 mb-4">
          <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block">
            Select Reminder Channel
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'both' as const, label: 'Email & WhatsApp', icon: Send },
              { id: 'email' as const, label: 'Email Only', icon: Mail },
              { id: 'whatsapp' as const, label: 'WhatsApp Only', icon: MessageSquare },
            ].map((ch) => {
              const Icon = ch.icon;
              const isSelected = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#5b598b] bg-[#eeedf6] text-[#1a1b22]'
                      : 'border-[#e3e1ea] bg-white text-[#444748] hover:border-[#747878]'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-[#5b598b]' : 'text-[#747878]'} />
                  <span className="text-xs font-bold leading-tight">{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Client Phone for WhatsApp (if WhatsApp is selected) */}
        {isWhatsAppSelected && (
          <div className="mb-4 p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-caps text-[10px] uppercase text-[#065f46] font-bold flex items-center gap-1.5">
                <MessageSquare size={13} />
                <span>Client WhatsApp Mobile Number *</span>
              </label>
              {onOpenConnectChannels && (
                <button
                  type="button"
                  onClick={onOpenConnectChannels}
                  className="text-[11px] text-[#059669] hover:underline font-semibold"
                >
                  Channel Settings
                </button>
              )}
            </div>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210 (or 10-digit number)"
              className="w-full px-3 py-2 bg-white border border-[#a7f3d0] rounded-md text-xs font-mono text-[#1a1b22] focus:outline-none focus:border-[#059669]"
            />
            <p className="text-[11px] text-[#065f46]">
              WhatsApp will open with your pre-written message, including your UPI and bank details.
            </p>
          </div>
        )}

        {/* 3. Tone Selector */}
        <div className="mb-4">
          <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
            Reminder Tone
          </label>
          <div className="flex gap-2">
            {[
              { id: 'gentle' as const, label: 'Gentle' },
              { id: 'professional' as const, label: 'Professional' },
              { id: 'firm' as const, label: 'Firm / Urgent' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md border font-semibold cursor-pointer transition-colors ${
                  tone === t.id
                    ? 'border-[#5b598b] bg-[#f4f2fc] text-[#5b598b]'
                    : 'border-[#e3e1ea] text-[#444748] hover:bg-[#f4f2fc]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Live Message Preview */}
        <div className="border border-[#e3e1ea] rounded-lg overflow-hidden mb-4">
          <div className="bg-[#f4f2fc] px-3 py-2 border-b border-[#e3e1ea] flex items-center justify-between">
            <span className="font-label-caps text-[10px] uppercase text-[#747878] font-bold">
              Message Preview
            </span>
            <div className="flex gap-1">
              {isWhatsAppSelected && (
                <button
                  type="button"
                  onClick={() => setShowPreviewTab('whatsapp')}
                  className={`px-2 py-0.5 text-[11px] rounded font-semibold cursor-pointer ${
                    showPreviewTab === 'whatsapp'
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-[#747878]'
                  }`}
                >
                  WhatsApp Text
                </button>
              )}
              {isEmailSelected && (
                <button
                  type="button"
                  onClick={() => setShowPreviewTab('email')}
                  className={`px-2 py-0.5 text-[11px] rounded font-semibold cursor-pointer ${
                    showPreviewTab === 'email'
                      ? 'bg-white text-[#5b598b] shadow-xs'
                      : 'text-[#747878]'
                  }`}
                >
                  Email Copy
                </button>
              )}
            </div>
          </div>

          <div className="p-3 text-xs text-[#1a1b22] bg-white max-h-36 overflow-y-auto whitespace-pre-wrap font-sans">
            {showPreviewTab === 'whatsapp' ? whatsappContent : emailContent.bodyText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[#e3e1ea]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting}
            className="bg-[#1c1b1b] hover:bg-black text-white px-6 py-3 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            <Send size={15} />
            <span>Send Reminder Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
