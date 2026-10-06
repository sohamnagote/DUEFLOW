import React, { useState } from 'react';
import { X, Mail, MessageSquare, CheckCircle2, ShieldCheck, ExternalLink, Smartphone, Send, Zap } from 'lucide-react';
import { UserProfile, IntegrationsConfig } from '../types';
import { buildWhatsAppUrl } from '../utils/whatsappEngine';

interface ChannelConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaveIntegrations: (config: IntegrationsConfig) => void;
}

export const ChannelConnectModal: React.FC<ChannelConnectModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaveIntegrations,
}) => {
  const defaultIntegrations: IntegrationsConfig = user.integrations || {
    email: {
      enabled: true,
      connected: true,
      provider: 'dueflow_mailer',
      sender_name: user.full_name || 'Creative Studio',
      sender_email: user.email || 'billing@dueflow.in',
    },
    whatsapp: {
      enabled: true,
      connected: !!user.phone,
      sender_phone: user.phone || '',
      mode: 'direct_web',
      default_template: 'standard',
    },
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'whatsapp'>('overview');
  const [emailConfig, setEmailConfig] = useState(defaultIntegrations.email);
  const [whatsappConfig, setWhatsappConfig] = useState(defaultIntegrations.whatsapp);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: IntegrationsConfig = {
      email: {
        ...emailConfig,
        connected: emailConfig.enabled,
      },
      whatsapp: {
        ...whatsappConfig,
        connected: !!whatsappConfig.sender_phone.trim(),
      },
    };

    onSaveIntegrations(updated);
    setShowSaveFeedback(true);
    setTimeout(() => {
      setShowSaveFeedback(false);
      onClose();
    }, 1000);
  };

  // Test WhatsApp message dispatch
  const testMessage = `Hello from DueFlow! Your WhatsApp payment reminder integration is connected and active. You can now dispatch 1-click reminders to clients.`;
  const testWhatsAppUrl = buildWhatsAppUrl(whatsappConfig.sender_phone || user.phone || '', testMessage);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e3e1ea]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#eeedf6] text-[#5b598b] flex items-center justify-center font-bold">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1a1b22] tracking-tight">
                Connect Channels &amp; Integrations
              </h2>
              <p className="text-xs text-[#747878]">
                Configure Email and WhatsApp for automated reminders
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

        {/* Tab navigation */}
        <div className="flex gap-2 mt-4 border-b border-[#e3e1ea] pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#1c1b1b] text-white'
                : 'text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[#1c1b1b] text-white'
                : 'text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc]'
            }`}
          >
            <Mail size={13} />
            <span>Email Channel</span>
            {emailConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#5b598b]"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-[#1c1b1b] text-white'
                : 'text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc]'
            }`}
          >
            <MessageSquare size={13} />
            <span>WhatsApp</span>
            {whatsappConfig.connected && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            )}
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === 'overview' && (
          <div className="py-4 space-y-4">
            <p className="text-xs text-[#444748] leading-relaxed">
              DueFlow sends your invoice reminders automatically. You can send polite email reminders directly to your clients or send 1-click WhatsApp messages with payment details and total amount.
            </p>

            {/* Email Channel Card */}
            <div className="p-4 rounded-xl border border-[#e3e1ea] bg-[#fbf8ff] flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#cac6ff] text-[#5b598b] flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1b22]">Email Automation</span>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#cac6ff]/50 text-[#18173a]">
                      <CheckCircle2 size={10} />
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-[#747878] mt-1">
                    Sends clean reminder emails with your bank or UPI payment details and due date.
                  </p>
                  <div className="text-[11px] text-[#5b598b] font-medium mt-2">
                    Sender: {emailConfig.sender_name || user.full_name || 'Accounts'} ({emailConfig.sender_email || user.email})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('email')}
                className="text-xs text-[#5b598b] hover:underline font-semibold cursor-pointer shrink-0 mt-1"
              >
                Configure
              </button>
            </div>

            {/* WhatsApp Channel Card */}
            <div className="p-4 rounded-xl border border-[#e3e1ea] bg-white flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1b22]">WhatsApp Dispatch</span>
                    {whatsappConfig.connected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46]">
                        <CheckCircle2 size={10} />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e]">
                        Setup Phone
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#747878] mt-1">
                    Enables 1-click WhatsApp payment reminders sent directly to your client’s mobile phone with complete remittance details.
                  </p>
                  <div className="text-[11px] text-[#444748] font-medium mt-2">
                    {whatsappConfig.sender_phone
                      ? `Registered phone: ${whatsappConfig.sender_phone}`
                      : 'No WhatsApp number attached yet'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className="text-xs text-[#059669] hover:underline font-semibold cursor-pointer shrink-0 mt-1"
              >
                {whatsappConfig.connected ? 'Edit' : 'Connect'}
              </button>
            </div>

            <div className="p-3 bg-[#f4f2fc] rounded-lg flex items-center gap-2.5 text-xs text-[#5b598b]">
              <ShieldCheck size={16} className="shrink-0" />
              <span>
                All messages are sent safely with no unsolicited emails or spam.
              </span>
            </div>
          </div>
        )}

        {/* Email Settings Tab */}
        {activeTab === 'email' && (
          <div className="py-4 space-y-4">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Sender Name / Agency Identity
              </label>
              <input
                type="text"
                value={emailConfig.sender_name}
                onChange={(e) => setEmailConfig({ ...emailConfig, sender_name: e.target.value })}
                placeholder="e.g. Studio Vertex Billing"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md text-sm text-[#1a1b22] focus:outline-none focus:border-[#5b598b]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Sender / Reply-To Email Address
              </label>
              <input
                type="email"
                value={emailConfig.sender_email}
                onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
                placeholder="e.g. billing@studiovertex.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md text-sm text-[#1a1b22] focus:outline-none focus:border-[#5b598b]"
              />
            </div>

            <div className="p-3 bg-[#f4f2fc] rounded-lg text-xs text-[#444748] space-y-1">
              <div className="font-bold text-[#1a1b22]">Automated Dispatch Engine</div>
              <p>
                Transactional follow-ups are routed through DueFlow’s high-deliverability mail engine with SPF &amp; DKIM signatures so reminders reach inboxes without spam filters.
              </p>
            </div>
          </div>
        )}

        {/* WhatsApp Settings Tab */}
        {activeTab === 'whatsapp' && (
          <div className="py-4 space-y-4">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Your WhatsApp Phone Number (with Country Code) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={whatsappConfig.sender_phone}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, sender_phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md text-sm text-[#1a1b22] focus:outline-none focus:border-[#059669] font-mono"
                />
              </div>
              <span className="text-[11px] text-[#747878] mt-1 block">
                Include country code (+91 for India, +1 for US, etc.)
              </span>
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Default WhatsApp Template Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'polite', label: 'Polite / Gentle' },
                  { id: 'standard', label: 'Professional' },
                  { id: 'firm', label: 'Firm & Direct' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWhatsappConfig({ ...whatsappConfig, default_template: t.id as any })}
                    className={`py-2 px-3 text-xs rounded-lg border font-semibold cursor-pointer transition-colors ${
                      whatsappConfig.default_template === t.id
                        ? 'border-[#059669] bg-[#ecfdf5] text-[#065f46]'
                        : 'border-[#e3e1ea] text-[#444748] hover:bg-[#f4f2fc]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test WhatsApp Link */}
            {whatsappConfig.sender_phone && (
              <div className="pt-2">
                <a
                  href={testWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#047857] hover:underline"
                >
                  <ExternalLink size={13} />
                  <span>Send test verification message to this WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[#e3e1ea]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="bg-[#1c1b1b] hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {showSaveFeedback ? (
              <>
                <CheckCircle2 size={14} className="text-[#a7f3d0]" />
                <span>Connected &amp; Saved!</span>
              </>
            ) : (
              <span>Save &amp; Connect Channels</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
