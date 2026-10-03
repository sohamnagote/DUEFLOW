import React, { useState } from 'react';
import { X, MessageSquare, ShieldCheck, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

interface ConnectWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPhone?: string;
  defaultBusinessName?: string;
}

export const ConnectWhatsAppModal: React.FC<ConnectWhatsAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultPhone = '',
  defaultBusinessName = '',
}) => {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [senderPhone, setSenderPhone] = useState(defaultPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      setError('Please provide both Phone Number ID and Permanent Access Token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api.connectWhatsAppBusiness({
        phone_number_id: phoneNumberId.trim(),
        business_account_id: wabaId.trim() || undefined,
        access_token: accessToken.trim(),
        business_name: businessName.trim() || undefined,
        sender_phone: senderPhone.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect WhatsApp Business account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSandboxConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mockPhoneId = `109283746501928`;
      const mockWabaId = `waba_prod_9981726`;
      const mockToken = `sim_meta_waba_tok_${Date.now()}`;
      await api.connectWhatsAppBusiness({
        phone_number_id: mockPhoneId,
        business_account_id: mockWabaId,
        access_token: mockToken,
        business_name: businessName || 'Studio Vertex Official',
        sender_phone: senderPhone || '+91 98765 43210',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect developer sandbox.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#e3e1ea]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1a1b22] tracking-tight">
                Connect WhatsApp Business
              </h2>
              <p className="text-xs text-[#747878]">
                Official Meta WhatsApp Business Platform Cloud API
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

        {error && (
          <div className="mt-4 p-3 bg-[#fff1f2] border border-[#fecdd3] rounded-lg text-xs text-[#be123c] flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Sandbox option banner */}
        <div className="mt-4 p-3.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#059669]" />
              <span className="text-xs font-bold text-[#14532d]">Developer Quick Connect</span>
            </div>
            <button
              type="button"
              onClick={handleQuickSandboxConnect}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer"
            >
              Connect Sandbox
            </button>
          </div>
          <p className="text-[11px] text-[#166534] mt-1.5 leading-relaxed">
            Connect a test WhatsApp environment to test sending payment reminders.
          </p>
        </div>

        {/* Production Credentials Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
              Phone Number ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 109283746501928"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#059669] text-xs font-mono text-[#1a1b22]"
            />
            <p className="text-[10px] text-[#747878] mt-1">Found in your Meta App Dashboard under WhatsApp &gt; API Setup.</p>
          </div>

          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              placeholder="e.g. 998172635441029"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#059669] text-xs font-mono text-[#1a1b22]"
            />
          </div>

          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
              System User Permanent Access Token *
            </label>
            <input
              type="password"
              required
              placeholder="EAAG... (stored encrypted at rest)"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#059669] text-xs font-mono text-[#1a1b22]"
            />
            <p className="text-[10px] text-[#747878] mt-1">Stored securely using AES-256-GCM encryption on the server.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Display Business Name
              </label>
              <input
                type="text"
                placeholder="Studio Vertex"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md text-xs text-[#1a1b22]"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Sender Phone (Verified)
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md text-xs text-[#1a1b22]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e3e1ea] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              <span>{isLoading ? 'Connecting...' : 'Connect & Verify'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
