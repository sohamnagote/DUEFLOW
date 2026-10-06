import React, { useState } from 'react';
import { X, Send, Copy, Check, Mail } from 'lucide-react';
import { Invoice, CadenceStage, UserProfile } from '../types';
import { getEmailTemplateContent } from '../utils/reminderEngine';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  stageNumber: CadenceStage;
  user: UserProfile;
  onSendTest?: (invoice: Invoice, stage: CadenceStage) => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  stageNumber,
  user,
  onSendTest,
}) => {
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen || !invoice) return null;

  const content = getEmailTemplateContent(stageNumber, invoice, user);

  const handleCopy = () => {
    navigator.clipboard.writeText(viewMode === 'html' ? content.bodyHtml : content.bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSimulated = () => {
    if (onSendTest) {
      onSendTest(invoice, stageNumber);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e3e1ea]">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={18} className="text-[#5b598b] shrink-0" />
            <div className="min-w-0">
              <span className="font-label-caps text-[10px] uppercase text-[#747878] font-bold tracking-wider block">
                EMAIL PREVIEW
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#1a1b22] truncate">
                Stage 0{stageNumber}: {invoice.invoice_number}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-[#f4f2fc] p-0.5 rounded border border-[#e3e1ea] text-xs">
              <button
                onClick={() => setViewMode('html')}
                className={`px-2.5 py-1.5 min-h-[32px] rounded text-[11px] font-semibold cursor-pointer ${
                  viewMode === 'html' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878]'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1.5 min-h-[32px] rounded text-[11px] font-semibold cursor-pointer ${
                  viewMode === 'text' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#747878]'
                }`}
              >
                Text
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 flex items-center justify-center text-[#747878] hover:text-[#1a1b22] rounded-md hover:bg-[#f4f2fc] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Envelope Meta */}
        <div className="bg-[#fbf8ff] p-3 sm:p-3.5 my-3 sm:my-4 rounded border border-[#e3e1ea] text-xs space-y-1">
          <div>
            <span className="text-[#747878] font-medium">To: </span>
            <span className="text-[#1a1b22] font-semibold">{invoice.client_email}</span>
            <span className="text-[#747878]"> ({invoice.client_name})</span>
          </div>
          <div>
            <span className="text-[#747878] font-medium">From: </span>
            <span className="text-[#1a1b22]">{user.business_name} &lt;reminders@dueflow.in&gt;</span>
          </div>
          <div>
            <span className="text-[#747878] font-medium">Reply-To: </span>
            <span className="text-[#1a1b22] font-mono">{user.email}</span>
          </div>
          <div className="pt-1 text-[#1a1b22] font-semibold">
            <span className="text-[#747878] font-normal">Subject: </span>
            {content.subject}
          </div>
        </div>

        {/* Content Body Frame */}
        <div className="border border-[#e3e1ea] rounded-md p-3 sm:p-4 max-h-[340px] overflow-y-auto bg-white">
          {viewMode === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />
          ) : (
            <pre className="font-mono text-xs whitespace-pre-wrap text-[#1a1b22] leading-relaxed">
              {content.bodyText}
            </pre>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-[#e3e1ea] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] sm:min-h-0 border border-[#e3e1ea] rounded-lg text-[#444748] hover:text-[#1a1b22] flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer active:scale-[0.98]"
            >
              {copied ? <Check size={14} className="text-[#5b598b]" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Content'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {sentSuccess && (
              <span className="text-[#5b598b] font-semibold text-center">Sent test reminder!</span>
            )}
            <button
              onClick={handleSendSimulated}
              className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Send size={14} />
              <span>Send Test Reminder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
