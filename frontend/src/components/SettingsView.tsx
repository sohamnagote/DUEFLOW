import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  Shield,
  CreditCard,
  Building2,
  User,
  MessageSquare,
  Mail,
  Zap,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  LogOut,
  Send,
  Sparkles,
} from 'lucide-react';
import { UserProfile, ToneTemplate, SafeIntegration, IntegrationSettingsResponse } from '../types';
import { api } from '../lib/api';
import { ConnectWhatsAppModal } from './ConnectWhatsAppModal';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onResetData,
}) => {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Real database integrations state
  const [integrations, setIntegrations] = useState<SafeIntegration[]>([]);
  const [channelSettings, setChannelSettings] = useState<IntegrationSettingsResponse>({
    default_reminder_channel: user.default_reminder_channel || 'email',
    email_reminders_enabled: user.email_reminders_enabled ?? true,
    whatsapp_reminders_enabled: user.whatsapp_reminders_enabled ?? false,
    can_select_both: false,
    email_connected: false,
    whatsapp_connected: false,
  });

  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [isConnectWhatsAppOpen, setIsConnectWhatsAppOpen] = useState(false);
  const [testActionMessage, setTestActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch real integrations from backend database
  const loadIntegrations = async () => {
    setIsLoadingIntegrations(true);
    try {
      const res = await api.getIntegrations();
      if (res?.integrations) {
        setIntegrations(res.integrations);
      }
      if (res?.settings) {
        setChannelSettings(res.settings);
      }
    } catch (err: any) {
      console.warn('[SettingsView] Error loading integrations:', err);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Sync profile when user prop changes
  useEffect(() => {
    setProfile(user);
  }, [user]);

  // Listen for OAuth popup completion via cross-origin postMessage
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Validate origin if needed
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1')
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsConnectingEmail(false);
        setTestActionMessage({
          type: 'success',
          text: `Successfully connected ${event.data.provider === 'google' ? 'Gmail' : 'Microsoft Outlook'} account!`,
        });
        loadIntegrations();
        setTimeout(() => setTestActionMessage(null), 5000);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setIsConnectingEmail(false);
        setTestActionMessage({
          type: 'error',
          text: `Connection failed: ${event.data.error || 'Authorization rejected'}`,
        });
        setTimeout(() => setTestActionMessage(null), 5000);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Email connection actions
  const handleConnectGmail = async () => {
    setIsConnectingEmail(true);
    setTestActionMessage(null);
    try {
      const res = await api.startGoogleEmailOAuth();
      const authWindow = window.open(
        res.url,
        'dueflow_google_oauth',
        'width=600,height=700,status=no,resizable=yes'
      );
      if (!authWindow) {
        alert('Please allow popups to authorize your Google Gmail account.');
        setIsConnectingEmail(false);
      }
    } catch (err: any) {
      setIsConnectingEmail(false);
      setTestActionMessage({ type: 'error', text: err.message || 'Could not initiate Google connection' });
    }
  };

  const handleConnectOutlook = async () => {
    setIsConnectingEmail(true);
    setTestActionMessage(null);
    try {
      const res = await api.startMicrosoftEmailOAuth();
      const authWindow = window.open(
        res.url,
        'dueflow_microsoft_oauth',
        'width=600,height=700,status=no,resizable=yes'
      );
      if (!authWindow) {
        alert('Please allow popups to authorize your Microsoft account.');
        setIsConnectingEmail(false);
      }
    } catch (err: any) {
      setIsConnectingEmail(false);
      setTestActionMessage({ type: 'error', text: err.message || 'Could not initiate Microsoft connection' });
    }
  };

  const handleSendTestEmail = async () => {
    setTestActionMessage(null);
    try {
      const res = await api.sendTestEmail();
      setTestActionMessage({
        type: res.success ? 'success' : 'error',
        text: res.message + (res.providerMessageId ? ` (ID: ${res.providerMessageId})` : ''),
      });
      loadIntegrations();
    } catch (err: any) {
      setTestActionMessage({ type: 'error', text: err.message || 'Test email failed to send.' });
    }
    setTimeout(() => setTestActionMessage(null), 6000);
  };

  const handleDisconnectEmail = async (provider?: string) => {
    if (!confirm('Are you sure you want to disconnect this email integration?')) return;
    try {
      await api.disconnectEmail(provider);
      await loadIntegrations();
      setTestActionMessage({ type: 'success', text: 'Email integration disconnected.' });
    } catch (err: any) {
      setTestActionMessage({ type: 'error', text: err.message });
    }
    setTimeout(() => setTestActionMessage(null), 4000);
  };

  // WhatsApp connection actions
  const handleSendTestWhatsApp = async () => {
    setTestActionMessage(null);
    try {
      const res = await api.sendTestWhatsApp(profile.phone);
      setTestActionMessage({
        type: res.success ? 'success' : 'error',
        text: res.message + (res.providerMessageId ? ` (ID: ${res.providerMessageId})` : ''),
      });
      loadIntegrations();
    } catch (err: any) {
      setTestActionMessage({ type: 'error', text: err.message || 'Test WhatsApp message failed to send.' });
    }
    setTimeout(() => setTestActionMessage(null), 6000);
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp Business account?')) return;
    try {
      await api.disconnectWhatsApp();
      await loadIntegrations();
      setTestActionMessage({ type: 'success', text: 'WhatsApp Business disconnected.' });
    } catch (err: any) {
      setTestActionMessage({ type: 'error', text: err.message });
    }
    setTimeout(() => setTestActionMessage(null), 4000);
  };

  // Submit all settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Save profile coordinates
      const updatedProfile: UserProfile = {
        ...profile,
        default_reminder_channel: channelSettings.default_reminder_channel,
        email_reminders_enabled: channelSettings.email_reminders_enabled,
        whatsapp_reminders_enabled: channelSettings.whatsapp_reminders_enabled,
      };

      await api.updateProfile(updatedProfile);

      // 2. Save integration reminder policy
      await api.updateIntegrationSettings({
        default_reminder_channel: channelSettings.default_reminder_channel,
        email_reminders_enabled: channelSettings.email_reminders_enabled,
        whatsapp_reminders_enabled: channelSettings.whatsapp_reminders_enabled,
      });

      onUpdateUser(updatedProfile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('[SettingsView] Save error:', err);
      setSaveError(err.message || 'Unable to save integration settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derived integration statuses from real database records
  const googleIntegration = integrations.find((i) => i.provider === 'google');
  const msIntegration = integrations.find((i) => i.provider === 'microsoft');
  const activeEmailIntegration = googleIntegration || msIntegration;
  const whatsappIntegration = integrations.find((i) => i.provider === 'whatsapp_business');

  const isEmailConnected = activeEmailIntegration?.status === 'CONNECTED';
  const isWhatsAppConnected = whatsappIntegration?.status === 'CONNECTED';

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] tracking-tight leading-none">
            SETTINGS
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            Manage your account and reminder settings.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 bg-[#d1fae5] text-[#065f46] px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs">
            <CheckCircle2 size={16} />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Structured Error Banner */}
      {saveError && (
        <div className="mb-6 p-4 bg-[#fff1f2] border border-[#fecdd3] rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-[#be123c] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[#9f1239] uppercase tracking-wide">Save Failed</h4>
            <p className="text-xs text-[#be123c] mt-0.5">{saveError}</p>
          </div>
        </div>
      )}

      {/* Test / Action Toast Banner */}
      {testActionMessage && (
        <div
          className={`mb-6 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all ${
            testActionMessage.type === 'success'
              ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
              : 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c]'
          }`}
        >
          {testActionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testActionMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-[#e3e1ea] pt-6 sm:pt-8 space-y-8 sm:space-y-10">
        {/* Simplified Integrations Section */}
        <div>
          <div className="mb-4">
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22] flex items-center gap-2">
              <Zap size={14} className="text-[#5b598b]" />
              <span>EMAIL &amp; WHATSAPP</span>
            </h3>
            <p className="text-xs text-[#747878] mt-1">
              Connect your channels to send reminders to clients.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Integration Card */}
            <div className="p-5 rounded-2xl border border-[#e3e1ea] bg-[#fbf8ff] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-[#5b598b]" />
                    <span className="font-bold text-base text-[#1a1b22]">EMAIL</span>
                  </div>

                  {/* Real Verified Status */}
                  {isEmailConnected ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#065f46]">
                      <CheckCircle2 size={12} />
                      CONNECTED
                    </span>
                  ) : activeEmailIntegration?.status === 'RECONNECT_REQUIRED' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#991b1b]">
                      <AlertTriangle size={12} />
                      RECONNECT REQUIRED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#64748b]">
                      NOT CONNECTED
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#444748] leading-relaxed">
                  Connect your email to send reminders.
                </p>

                {/* Connected Account Display */}
                {isEmailConnected && activeEmailIntegration?.display_email && (
                  <div className="mt-3.5 p-3 rounded-lg bg-white border border-[#e3e1ea] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#747878] block">
                        Connected Email
                      </span>
                      <span className="font-mono font-bold text-[#1a1b22] text-sm">
                        {activeEmailIntegration.display_email}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#059669] font-semibold bg-[#ecfdf5] px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#cac6ff]/40 flex flex-wrap items-center gap-2.5">
                {!isEmailConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      disabled={isConnectingEmail}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e3e1ea] rounded-lg text-xs font-bold text-[#1a1b22] flex items-center gap-2 cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <span>Connect Gmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConnectOutlook}
                      disabled={isConnectingEmail}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e3e1ea] rounded-lg text-xs font-bold text-[#1a1b22] flex items-center gap-2 cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <span>Connect Outlook</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e3e1ea] rounded-lg text-xs font-bold text-[#5b598b] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Send size={13} />
                      <span>Send Test Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnectEmail()}
                      className="px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Disconnect</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp Business Integration Card */}
            <div className="p-5 rounded-2xl border border-[#e3e1ea] bg-white flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#059669]" />
                    <span className="font-bold text-base text-[#1a1b22]">WHATSAPP</span>
                  </div>

                  {/* Real Verified Status */}
                  {isWhatsAppConnected ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#065f46]">
                      <CheckCircle2 size={12} />
                      CONNECTED
                    </span>
                  ) : whatsappIntegration?.status === 'SETUP_REQUIRED' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e]">
                      <AlertTriangle size={12} />
                      SETUP REQUIRED
                    </span>
                  ) : whatsappIntegration?.status === 'RECONNECT_REQUIRED' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#991b1b]">
                      <AlertTriangle size={12} />
                      RECONNECT REQUIRED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#64748b]">
                      NOT CONNECTED
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#444748] leading-relaxed">
                  Connect WhatsApp Business to send reminders.
                </p>

                {/* Connected WhatsApp Account Display */}
                {isWhatsAppConnected && (
                  <div className="mt-3.5 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#166534] block">
                        Connected Account
                      </span>
                      <span className="font-mono font-bold text-[#14532d] text-sm">
                        {whatsappIntegration?.business_name || 'WhatsApp Business'}
                      </span>
                      {whatsappIntegration?.display_phone && (
                        <span className="text-[11px] text-[#15803d] font-mono block">
                          Phone: {whatsappIntegration.display_phone}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#059669] font-bold bg-white px-2 py-0.5 rounded border border-[#bbf7d0]">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* WhatsApp Action Buttons */}
              <div className="pt-2 border-t border-[#e3e1ea] flex flex-wrap items-center gap-2.5">
                {!isWhatsAppConnected ? (
                  <button
                    type="button"
                    onClick={() => setIsConnectWhatsAppOpen(true)}
                    className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <MessageSquare size={14} />
                    <span>Connect WhatsApp Business</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSendTestWhatsApp}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e3e1ea] rounded-lg text-xs font-bold text-[#059669] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Send size={13} />
                      <span>Send Test WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectWhatsApp}
                      className="px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Disconnect</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. Channel Selection & Automation Policy Section */}
          <div className="mt-8 p-6 rounded-2xl border border-[#e3e1ea] bg-white space-y-6">
            <div>
              <h4 className="font-bold text-sm text-[#1a1b22] uppercase tracking-wider font-label-caps">
                Reminder Channels &amp; Automation Configuration
              </h4>
              <p className="text-xs text-[#747878] mt-0.5">
                Choose your preferred reminder channel and delivery rules.
              </p>
            </div>

            {/* Default Channel Selector */}
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-2">
                Default Reminder Channel
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Email Option */}
                <label
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    channelSettings.default_reminder_channel === 'email'
                      ? 'border-[#5b598b] bg-[#fbf8ff] ring-2 ring-[#5b598b]/20'
                      : 'border-[#e3e1ea] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="default_channel"
                      value="email"
                      checked={channelSettings.default_reminder_channel === 'email'}
                      onChange={() =>
                        setChannelSettings({ ...channelSettings, default_reminder_channel: 'email' })
                      }
                      className="text-[#5b598b]"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#1a1b22] block">Email</span>
                      <span className="text-[10px] text-[#747878]">Automated email reminders</span>
                    </div>
                  </div>
                  <Mail size={16} className="text-[#5b598b]" />
                </label>

                {/* WhatsApp Option */}
                <label
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    !isWhatsAppConnected
                      ? 'opacity-60 cursor-not-allowed bg-slate-50 border-[#e3e1ea]'
                      : channelSettings.default_reminder_channel === 'whatsapp'
                      ? 'border-[#059669] bg-[#f0fdf4] ring-2 ring-[#059669]/20 cursor-pointer'
                      : 'border-[#e3e1ea] bg-white hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="default_channel"
                      value="whatsapp"
                      disabled={!isWhatsAppConnected}
                      checked={channelSettings.default_reminder_channel === 'whatsapp'}
                      onChange={() =>
                        setChannelSettings({ ...channelSettings, default_reminder_channel: 'whatsapp' })
                      }
                      className="text-[#059669]"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#1a1b22] block">WhatsApp</span>
                      <span className="text-[10px] text-[#747878]">
                        {!isWhatsAppConnected ? 'Requires WhatsApp' : 'Instant reminder messages'}
                      </span>
                    </div>
                  </div>
                  <MessageSquare size={16} className="text-[#059669]" />
                </label>

                {/* Both Option (Only active if both are connected) */}
                <label
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    !isEmailConnected || !isWhatsAppConnected
                      ? 'opacity-60 cursor-not-allowed bg-slate-50 border-[#e3e1ea]'
                      : channelSettings.default_reminder_channel === 'both'
                      ? 'border-[#1a1b22] bg-[#f4f2fc] ring-2 ring-black/20 cursor-pointer'
                      : 'border-[#e3e1ea] bg-white hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="default_channel"
                      value="both"
                      disabled={!isEmailConnected || !isWhatsAppConnected}
                      checked={channelSettings.default_reminder_channel === 'both'}
                      onChange={() =>
                        setChannelSettings({ ...channelSettings, default_reminder_channel: 'both' })
                      }
                      className="text-[#1a1b22]"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#1a1b22] block">Both</span>
                      <span className="text-[10px] text-[#747878]">
                        {!isEmailConnected || !isWhatsAppConnected
                          ? 'Requires both channels'
                          : 'Dual-channel delivery'}
                      </span>
                    </div>
                  </div>
                  <Zap size={16} className="text-[#5b598b]" />
                </label>
              </div>

              {(!isEmailConnected || !isWhatsAppConnected) && (
                <p className="text-[11px] text-[#747878] mt-2 flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-[#747878]" />
                  <span>
                    "Both" channel delivery requires active connections to both Email and WhatsApp Business.
                  </span>
                </p>
              )}
            </div>

            {/* Automation Toggles */}
            <div className="pt-4 border-t border-[#e3e1ea] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e3e1ea] bg-slate-50/60">
                <div>
                  <span className="font-bold text-xs text-[#1a1b22] block">Email Reminders</span>
                  <span className="text-[11px] text-[#747878]">Automated 4-stage reminder schedule</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setChannelSettings({
                      ...channelSettings,
                      email_reminders_enabled: !channelSettings.email_reminders_enabled,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    channelSettings.email_reminders_enabled ? 'bg-[#5b598b] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e3e1ea] bg-slate-50/60">
                <div>
                  <span className="font-bold text-xs text-[#1a1b22] block">WhatsApp Reminders</span>
                  <span className="text-[11px] text-[#747878]">Automatic WhatsApp message reminders</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isWhatsAppConnected && !channelSettings.whatsapp_reminders_enabled) {
                      alert('Please connect your WhatsApp Business account first before enabling reminders.');
                      return;
                    }
                    setChannelSettings({
                      ...channelSettings,
                      whatsapp_reminders_enabled: !channelSettings.whatsapp_reminders_enabled,
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    channelSettings.whatsapp_reminders_enabled ? 'bg-[#059669] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Identity & Business Profile */}
        <div>
          <div className="mb-4">
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22] flex items-center gap-2">
              <User size={14} />
              <span>PROFILE &amp; BUSINESS DETAILS</span>
            </h3>
            <p className="text-xs text-[#747878] mt-1">This information appears in invoice reminders and signature lines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Business / Studio Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Studio Vertex"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Reply-To / Contact Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. billing@studio.in"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Phone / WhatsApp Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>
          </div>
        </div>

        {/* 3. Indian Direct Settlement Coordinates */}
        <div className="border-t border-[#e3e1ea] pt-8">
          <div className="mb-4">
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22] flex items-center gap-2">
              <CreditCard size={14} />
              <span>PAYMENT DETAILS (BANK &amp; UPI)</span>
            </h3>
            <p className="text-xs text-[#747878] mt-1">Included automatically in reminder emails and WhatsApp messages.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. studio@okicici"
                value={profile.upi_id || ''}
                onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm font-mono text-[#1a1b22]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 50200012345678"
                value={profile.bank_account || ''}
                onChange={(e) => setProfile({ ...profile, bank_account: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm font-mono text-[#1a1b22]"
              />
            </div>

            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                Bank IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                value={profile.bank_ifsc || ''}
                onChange={(e) => setProfile({ ...profile, bank_ifsc: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm font-mono uppercase text-[#1a1b22]"
              />
            </div>
          </div>
        </div>

        {/* 4. Tone Template Selector */}
        <div className="border-t border-[#e3e1ea] pt-8">
          <div className="mb-4">
            <h3 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22] flex items-center gap-2">
              <Building2 size={14} />
              <span>REMINDER TONE &amp; STYLE</span>
            </h3>
            <p className="text-xs text-[#747878] mt-1">Default tone used for automated follow-up messages.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                { id: 'Gentle Creative Professional', desc: 'Courteous partnership tone suitable for design & agency accounts.' },
                { id: 'Casual Friendly', desc: 'Direct, friendly check-in tone for close-knit client relationships.' },
                { id: 'Firm & Direct', desc: 'Direct, clear follow-up emphasizing due dates and payment terms.' },
              ] as const
            ).map((t) => (
              <label
                key={t.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  profile.default_tone === t.id
                    ? 'border-[#5b598b] bg-[#fbf8ff] ring-1 ring-[#5b598b]'
                    : 'border-[#e3e1ea] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="default_tone"
                    value={t.id}
                    checked={profile.default_tone === t.id}
                    onChange={() => setProfile({ ...profile, default_tone: t.id as ToneTemplate })}
                    className="text-[#5b598b]"
                  />
                  <span className="font-bold text-xs text-[#1a1b22]">{t.id}</span>
                </div>
                <p className="text-xs text-[#747878] pl-5">{t.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#e3e1ea]">
          <button
            type="button"
            onClick={onResetData}
            className="text-xs text-[#ba1a1a] hover:underline flex items-center justify-center gap-1.5 cursor-pointer font-medium min-h-[44px] sm:min-h-0 py-2"
          >
            <RefreshCw size={13} />
            <span>Reset Demo Workspace Data</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-8 py-3.5 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</span>
          </button>
        </div>
      </form>

      {/* Connect WhatsApp Modal */}
      <ConnectWhatsAppModal
        isOpen={isConnectWhatsAppOpen}
        onClose={() => setIsConnectWhatsAppOpen(false)}
        onSuccess={() => {
          loadIntegrations();
          setTestActionMessage({ type: 'success', text: 'WhatsApp Business account connected successfully!' });
          setTimeout(() => setTestActionMessage(null), 5000);
        }}
        defaultPhone={profile.phone}
        defaultBusinessName={profile.business_name}
      />
    </div>
  );
};
