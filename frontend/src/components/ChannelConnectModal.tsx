import React, { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';
import { ConnectWhatsAppModal } from './ConnectWhatsAppModal';

interface ChannelConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaveIntegrations?: (config?: any) => void;
}

export const ChannelConnectModal: React.FC<ChannelConnectModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchChannelStatuses = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getIntegrations();
      if (res?.integrations) {
        const email = res.integrations.find(
          (i) => i.channel === 'email' && i.status === 'CONNECTED'
        );
        const wa = res.integrations.find(
          (i) => i.channel === 'whatsapp' && i.status === 'CONNECTED'
        );
        setIsEmailConnected(Boolean(email));
        setIsWhatsAppConnected(Boolean(wa));
      }
    } catch {
      setIsEmailConnected(false);
      setIsWhatsAppConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChannelStatuses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectEmail = async () => {
    setErrorMessage(null);
    try {
      const res = await api.startGoogleEmailOAuth();
      if (res?.url) {
        window.open(res.url, 'dueflow_email_auth', 'width=600,height=700');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start email connection.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 border border-[#e3e1ea] shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between pb-5 border-b border-[#e3e1ea]">
            <div>
              <h2 className="text-xl font-bold text-[#1a1b22] tracking-tight">
                CONNECT YOUR CHANNELS
              </h2>
              <p className="text-xs text-[#747878] mt-1">
                Choose how DueFlow should send reminders.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Channels List */}
          <div className="py-6 space-y-6">
            {/* EMAIL Channel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#e3e1ea] bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[#5b598b]" />
                  <span className="font-bold text-sm text-[#1a1b22]">EMAIL</span>
                </div>
                <p className="text-xs text-[#747878]">
                  Send automatic invoice reminders by email.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="text-[#747878]">Status:</span>
                  <span
                    className={
                      isEmailConnected
                        ? 'text-[#059669]'
                        : 'text-[#747878]'
                    }
                  >
                    {isEmailConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>
              </div>

              <div>
                {isEmailConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#ecfdf5] px-3 py-1.5 rounded-md">
                    <CheckCircle2 size={13} />
                    Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectEmail}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-[#1c1b1b] text-white text-xs font-semibold rounded-md transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Connect Email
                  </button>
                )}
              </div>
            </div>

            {/* WHATSAPP Channel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#e3e1ea] bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#059669]" />
                  <span className="font-bold text-sm text-[#1a1b22]">WHATSAPP</span>
                </div>
                <p className="text-xs text-[#747878]">
                  Send automatic invoice reminders through WhatsApp Business.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="text-[#747878]">Status:</span>
                  <span
                    className={
                      isWhatsAppConnected
                        ? 'text-[#059669]'
                        : 'text-[#747878]'
                    }
                  >
                    {isWhatsAppConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>
              </div>

              <div>
                {isWhatsAppConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#ecfdf5] px-3 py-1.5 rounded-md">
                    <CheckCircle2 size={13} />
                    Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-[#1c1b1b] text-white text-xs font-semibold rounded-md transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Connect WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#e3e1ea] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConnectWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={() => {
          setIsWhatsAppModalOpen(false);
          fetchChannelStatuses();
        }}
        defaultPhone={user.phone}
        defaultBusinessName={user.business_name}
      />
    </>
  );
};
