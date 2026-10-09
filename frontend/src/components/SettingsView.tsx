import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Building2,
  User,
  MessageSquare,
  Mail,
  Zap,
  AlertCircle,
  AlertTriangle,
  LogOut,
  Send,
  Upload,
  Trash2,
  QrCode,
  MapPin,
  FileText,
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

  // Test email state
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState(user.email || '');
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  // QR Code upload state
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

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
    if (!testEmailRecipient && user.email) {
      setTestEmailRecipient(user.email);
    }
  }, [user]);

  // Listen for OAuth popup completion via cross-origin postMessage
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1') &&
        !origin.includes('vercel.app') &&
        !origin.includes('onrender.com')
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

  const handleSendTestEmail = async (recipient: string) => {
    setIsSendingTestEmail(true);
    setTestActionMessage(null);
    try {
      const res = await api.sendTestEmail(recipient || profile.email);
      setTestActionMessage({
        type: res.success ? 'success' : 'error',
        text: res.message + (res.providerMessageId ? ` (ID: ${res.providerMessageId})` : ''),
      });
      setShowTestEmailModal(false);
      loadIntegrations();
    } catch (err: any) {
      setTestActionMessage({ type: 'error', text: err.message || 'Test email failed to send.' });
    } finally {
      setIsSendingTestEmail(false);
    }
    setTimeout(() => setTestActionMessage(null), 8000);
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

  // Payment QR Upload Handlers
  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setQrUploadError('Image size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    // Validate format
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setQrUploadError('Invalid file format. Please upload PNG, JPG, or WebP image.');
      return;
    }

    setIsUploadingQr(true);
    setQrUploadError(null);

    try {
      const res = await api.uploadPaymentQr(file);
      const updatedProfile = { ...profile, payment_qr_url: res.qrUrl };
      setProfile(updatedProfile);
      onUpdateUser(updatedProfile);
      setTestActionMessage({ type: 'success', text: 'Payment QR code uploaded and saved successfully.' });
      setTimeout(() => setTestActionMessage(null), 5000);
    } catch (err: any) {
      setQrUploadError(err.message || 'Failed to upload QR image.');
    } finally {
      setIsUploadingQr(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleDeleteQr = async () => {
    if (!confirm('Are you sure you want to remove your payment QR code?')) return;
    setIsUploadingQr(true);
    setQrUploadError(null);
    try {
      await api.deletePaymentQr();
      const updatedProfile = { ...profile, payment_qr_url: undefined };
      setProfile(updatedProfile);
      onUpdateUser(updatedProfile);
      setTestActionMessage({ type: 'success', text: 'Payment QR code removed.' });
      setTimeout(() => setTestActionMessage(null), 4000);
    } catch (err: any) {
      setQrUploadError(err.message || 'Failed to remove QR image.');
    } finally {
      setIsUploadingQr(false);
    }
  };

  // Submit all settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedProfile: UserProfile = {
        ...profile,
        default_reminder_channel: channelSettings.default_reminder_channel,
        email_reminders_enabled: channelSettings.email_reminders_enabled,
        whatsapp_reminders_enabled: channelSettings.whatsapp_reminders_enabled,
      };

      await api.updateProfile(updatedProfile);

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
      setSaveError(err.message || 'Unable to save settings.');
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
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1b22] tracking-tight">
            Settings
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            Manage your business profile, payment coordinates, and communication channels.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 bg-[#d1fae5] text-[#065f46] px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs">
            <CheckCircle2 size={15} />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Save Error Banner */}
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* =================================================================== */}
        {/* SECTION 1: BUSINESS PROFILE */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f5f9]">
            <Building2 size={18} className="text-[#3b82f6]" />
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">Business Profile</h2>
              <p className="text-xs text-[#64748b]">Your identity shown on client invoices and reminder messages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Business / Freelancer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Studio"
                value={profile.business_name || ''}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Your Name / Sender Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Business Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. contact@acmestudio.in"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Business Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 402 Business Tower, Bandra West, Mumbai 400050"
                value={profile.address || ''}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
              />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: PAYMENT DETAILS & QR CODE */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f5f9]">
            <CreditCard size={18} className="text-[#10b981]" />
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">Payment Details</h2>
              <p className="text-xs text-[#64748b]">Direct settlement coordinates included in client reminders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. studio@okicici"
                value={profile.upi_id || ''}
                onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm font-mono text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                value={profile.bank_name || ''}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 50200012345678"
                value={profile.bank_account || ''}
                onChange={(e) => setProfile({ ...profile, bank_account: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm font-mono text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Bank IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                value={profile.bank_ifsc || ''}
                onChange={(e) => setProfile({ ...profile, bank_ifsc: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm font-mono uppercase text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Payment Instructions / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Please mention the invoice number in the UPI/transfer remarks"
                value={profile.payment_notes || ''}
                onChange={(e) => setProfile({ ...profile, payment_notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]"
              />
            </div>
          </div>

          {/* Payment QR Code Upload Sub-section */}
          <div className="pt-4 border-t border-[#f1f5f9]">
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={16} className="text-[#475569]" />
              <label className="text-xs font-semibold text-[#0f172a]">
                Payment QR Code Image
              </label>
            </div>
            <p className="text-xs text-[#64748b] mb-4">
              Upload your own UPI QR code (Google Pay, PhonePe, Paytm, or BHIM). It will be embedded directly inside reminder emails.
            </p>

            {qrUploadError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {qrUploadError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {profile.payment_qr_url ? (
                <div className="relative group p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center gap-4">
                  <img
                    src={profile.payment_qr_url}
                    alt="Payment QR"
                    className="w-24 h-24 object-contain rounded-lg border border-[#cbd5e1] bg-white shadow-xs"
                  />
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={12} />
                      QR Code Active
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={isUploadingQr}
                        className="text-xs font-medium text-[#3b82f6] hover:underline cursor-pointer"
                      >
                        Replace
                      </button>
                      <span className="text-[#cbd5e1]">•</span>
                      <button
                        type="button"
                        onClick={handleDeleteQr}
                        disabled={isUploadingQr}
                        className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  disabled={isUploadingQr}
                  className="px-4 py-3 border-2 border-dashed border-[#cbd5e1] hover:border-[#3b82f6] rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-xs font-medium text-[#475569] flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Upload size={16} className="text-[#64748b]" />
                  <span>{isUploadingQr ? 'Uploading QR Code...' : 'Upload QR Image (PNG, JPG, WebP up to 2MB)'}</span>
                </button>
              )}

              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleQrFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: EMAIL CONNECTION */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <Mail size={18} className="text-[#6366f1]" />
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">Email Connection</h2>
                <p className="text-xs text-[#64748b]">Send reminders directly from your own Gmail or Outlook account</p>
              </div>
            </div>

            {isEmailConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={13} />
                Connected
              </span>
            ) : activeEmailIntegration?.status === 'RECONNECT_REQUIRED' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={13} />
                Reconnect Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                Not Connected
              </span>
            )}
          </div>

          {isEmailConnected && activeEmailIntegration?.display_email && (
            <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748b] block">Connected Account</span>
                <span className="font-medium text-[#0f172a] text-sm">{activeEmailIntegration.display_email}</span>
                <span className="text-[11px] text-[#64748b] block mt-0.5">
                  Provider: {googleIntegration ? 'Google Gmail API' : 'Microsoft Outlook Graph API'}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isEmailConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnectingEmail}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#cbd5e1] rounded-lg text-xs font-semibold text-[#0f172a] flex items-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
                >
                  <Mail size={14} className="text-red-500" />
                  <span>Connect Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={handleConnectOutlook}
                  disabled={isConnectingEmail}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#cbd5e1] rounded-lg text-xs font-semibold text-[#0f172a] flex items-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
                >
                  <Mail size={14} className="text-blue-500" />
                  <span>Connect Outlook</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowTestEmailModal(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#cbd5e1] rounded-lg text-xs font-semibold text-[#0f172a] flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send size={13} className="text-[#6366f1]" />
                  <span>Send Test Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDisconnectEmail()}
                  className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 4: WHATSAPP CONNECTION */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <MessageSquare size={18} className="text-[#10b981]" />
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">WhatsApp Business Connection</h2>
                <p className="text-xs text-[#64748b]">Send instant WhatsApp message reminders to clients</p>
              </div>
            </div>

            {isWhatsAppConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={13} />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                Not Connected
              </span>
            )}
          </div>

          {isWhatsAppConnected && (
            <div className="p-3.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-xs">
              <span className="text-[10px] uppercase font-bold text-[#166534] block">Connected Account</span>
              <span className="font-medium text-[#14532d] text-sm">
                {whatsappIntegration?.business_name || 'WhatsApp Business'}
              </span>
              {whatsappIntegration?.display_phone && (
                <span className="text-[11px] text-[#15803d] font-mono block mt-0.5">
                  Phone: {whatsappIntegration.display_phone}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isWhatsAppConnected ? (
              <button
                type="button"
                onClick={() => setIsConnectWhatsAppOpen(true)}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <MessageSquare size={14} />
                <span>Connect WhatsApp Business</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSendTestWhatsApp}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#cbd5e1] rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send Test WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 5: REMINDER PREFERENCES */}
        {/* =================================================================== */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f5f9]">
            <Zap size={18} className="text-[#8b5cf6]" />
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">Reminder Preferences</h2>
              <p className="text-xs text-[#64748b]">Configure your automated dispatch schedule and communication tone</p>
            </div>
          </div>

          {/* Default Channel */}
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-2">
              Default Delivery Channel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  channelSettings.default_reminder_channel === 'email'
                    ? 'border-[#6366f1] bg-[#f5f3ff] ring-2 ring-[#6366f1]/20'
                    : 'border-[#e2e8f0] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="default_channel"
                    value="email"
                    checked={channelSettings.default_reminder_channel === 'email'}
                    onChange={() => setChannelSettings({ ...channelSettings, default_reminder_channel: 'email' })}
                    className="text-[#6366f1]"
                  />
                  <div>
                    <span className="font-semibold text-xs text-[#0f172a] block">Email</span>
                    <span className="text-[11px] text-[#64748b]">Standard invoice email</span>
                  </div>
                </div>
                <Mail size={16} className="text-[#6366f1]" />
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                  !isWhatsAppConnected
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-[#e2e8f0]'
                    : channelSettings.default_reminder_channel === 'whatsapp'
                    ? 'border-[#10b981] bg-[#ecfdf5] ring-2 ring-[#10b981]/20 cursor-pointer'
                    : 'border-[#e2e8f0] bg-white hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="default_channel"
                    value="whatsapp"
                    disabled={!isWhatsAppConnected}
                    checked={channelSettings.default_reminder_channel === 'whatsapp'}
                    onChange={() => setChannelSettings({ ...channelSettings, default_reminder_channel: 'whatsapp' })}
                    className="text-[#10b981]"
                  />
                  <div>
                    <span className="font-semibold text-xs text-[#0f172a] block">WhatsApp</span>
                    <span className="text-[11px] text-[#64748b]">
                      {!isWhatsAppConnected ? 'Requires WhatsApp' : 'Direct mobile message'}
                    </span>
                  </div>
                </div>
                <MessageSquare size={16} className="text-[#10b981]" />
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                  !isEmailConnected || !isWhatsAppConnected
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-[#e2e8f0]'
                    : channelSettings.default_reminder_channel === 'both'
                    ? 'border-[#0f172a] bg-[#f8fafc] ring-2 ring-black/10 cursor-pointer'
                    : 'border-[#e2e8f0] bg-white hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="default_channel"
                    value="both"
                    disabled={!isEmailConnected || !isWhatsAppConnected}
                    checked={channelSettings.default_reminder_channel === 'both'}
                    onChange={() => setChannelSettings({ ...channelSettings, default_reminder_channel: 'both' })}
                    className="text-[#0f172a]"
                  />
                  <div>
                    <span className="font-semibold text-xs text-[#0f172a] block">Both Channels</span>
                    <span className="text-[11px] text-[#64748b]">Email + WhatsApp</span>
                  </div>
                </div>
                <Zap size={16} className="text-[#8b5cf6]" />
              </label>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-2">
              Default Tone of Voice
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  { id: 'Gentle Creative Professional', desc: 'Friendly, courteous partnership tone.' },
                  { id: 'Casual Friendly', desc: 'Direct, personal check-in tone.' },
                  { id: 'Firm & Direct', desc: 'Clear, concise reminder emphasizing payment deadline.' },
                ] as const
              ).map((t) => (
                <label
                  key={t.id}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    profile.default_tone === t.id
                      ? 'border-[#6366f1] bg-[#f5f3ff] ring-1 ring-[#6366f1]'
                      : 'border-[#e2e8f0] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="default_tone"
                      value={t.id}
                      checked={profile.default_tone === t.id}
                      onChange={() => setProfile({ ...profile, default_tone: t.id as ToneTemplate })}
                      className="text-[#6366f1]"
                    />
                    <span className="font-semibold text-xs text-[#0f172a]">{t.id}</span>
                  </div>
                  <p className="text-[11px] text-[#64748b] pl-5">{t.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={onResetData}
            className="text-xs text-red-600 hover:underline flex items-center justify-center gap-1.5 cursor-pointer font-medium py-2"
          >
            <RefreshCw size={13} />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-7 py-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* Test Email Recipient Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Send Test Email</h3>
              <p className="text-xs text-[#64748b] mt-1">
                Verify delivery through your connected email provider ({googleIntegration ? 'Gmail' : 'Outlook'}).
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Recipient Email Address
              </label>
              <input
                type="email"
                required
                placeholder="Enter email to receive test message"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowTestEmailModal(false)}
                disabled={isSendingTestEmail}
                className="px-4 py-2 text-xs font-medium text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendTestEmail(testEmailRecipient)}
                disabled={isSendingTestEmail || !testEmailRecipient}
                className="px-5 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSendingTestEmail ? 'Sending via Gmail...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
