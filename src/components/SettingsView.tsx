import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { dueflowApi } from '../utils/api';
import { ThemeToggle } from './ThemeToggle';
import { QrUploadProcessingAnimation } from './animations/QrUploadProcessingAnimation';

interface SettingsViewProps {
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  isOnboardingMode?: boolean;
  onOnboardingComplete?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onUpdateProfile,
  isOnboardingMode = false,
  onOnboardingComplete,
}) => {
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [preferredCurrency, setPreferredCurrency] = useState<'INR' | 'USD'>(
    userProfile?.preferredCurrency || 'INR'
  );
  const [timezone, setTimezone] = useState(
    userProfile?.timezone || 'Asia/Kolkata'
  );

  const [upiId, setUpiId] = useState(userProfile?.upiId || '');
  const [beneficiaryName, setBeneficiaryName] = useState(
    userProfile?.beneficiaryName || ''
  );
  const [bankName, setBankName] = useState(userProfile?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(userProfile?.accountNumber || '');
  const [routingNumber, setRoutingNumber] = useState(userProfile?.routingNumber || '');
  const [instructions, setInstructions] = useState(
    userProfile?.paymentInstructions || ''
  );

  const [qrFile, setQrFile] = useState<string | null>(userProfile?.paymentQrUrl || null);
  const [gmailConnected, setGmailConnected] = useState(userProfile?.gmailConnected || false);
  const [automatedReminders, setAutomatedReminders] = useState(
    userProfile?.automatedRemindersEnabled ?? true
  );

  // Status indicators for saves
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // QR Code deletion & upload animation state
  const [showDeleteQrModal, setShowDeleteQrModal] = useState(false);
  const [isDeletingQr, setIsDeletingQr] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadPreview, setQrUploadPreview] = useState<string | null>(null);
  const [qrUploadSuccess, setQrUploadSuccess] = useState(false);
  const [qrDeleteSuccess, setQrDeleteSuccess] = useState<string | null>(null);
  const [qrDeleteError, setQrDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Gmail OAuth status states
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);
  const [connectedGmailEmail, setConnectedGmailEmail] = useState<string | null>(null);

  // Load persisted user profile from backend database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const p = await dueflowApi.getProfile();
        if (isMounted && p) {
          setFullName(p.fullName || '');
          setEmail(p.email || '');
          if (p.preferredCurrency === 'USD' || p.preferredCurrency === 'INR') {
            setPreferredCurrency(p.preferredCurrency);
          }
          if (p.timezone) setTimezone(p.timezone);
          setUpiId(p.upiId || '');
          setBeneficiaryName(p.beneficiaryName || '');
          setBankName(p.bankName || '');
          setAccountNumber(p.accountNumber || '');
          setRoutingNumber(p.routingNumber || '');
          setInstructions(p.paymentInstructions || '');
          setQrFile(p.paymentQrUrl || null);
          if (typeof p.gmailConnected === 'boolean') setGmailConnected(p.gmailConnected);
          if (typeof p.automatedRemindersEnabled === 'boolean') {
            setAutomatedReminders(p.automatedRemindersEnabled);
          }
          if (onUpdateProfile) {
            onUpdateProfile(p);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server profile, using local defaults:', err);
      }

      // Check URL query parameters for OAuth callback results
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const gmailParam = params.get('gmail');
        if (gmailParam === 'connected') {
          const emailParam = params.get('email');
          if (isMounted) {
            setGmailConnected(true);
            if (emailParam) setConnectedGmailEmail(emailParam);
            setGmailSuccess('Gmail account connected successfully.');
            setTimeout(() => setGmailSuccess(null), 5000);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (gmailParam === 'error') {
          const errParam = params.get('error');
          if (isMounted) {
            setGmailError(errParam || 'Failed to complete Google OAuth connection.');
            setTimeout(() => setGmailError(null), 7000);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      // Query live Gmail integration status from backend
      try {
        const gStatus = await dueflowApi.getGmailStatus();
        if (isMounted && gStatus) {
          setGmailConnected(gStatus.connected);
          if (gStatus.email) setConnectedGmailEmail(gStatus.email);
        }
      } catch (_) {}
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setProfileError('Please enter your full name or business name to configure your workspace.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      await dueflowApi.updateProfile({
        fullName: trimmedName,
        email: email.trim(),
        preferredCurrency,
        timezone,
        onboardingCompleted: true,
      });

      const updatedProfile: UserProfile = {
        fullName: trimmedName,
        email: email.trim(),
        preferredCurrency,
        timezone,
        upiId,
        beneficiaryName,
        bankName,
        accountNumber,
        routingNumber,
        paymentInstructions: instructions,
        paymentQrUrl: qrFile,
        gmailConnected,
        automatedRemindersEnabled: automatedReminders,
        onboardingCompleted: true,
      };

      setProfileSaved(true);
      if (onUpdateProfile) {
        onUpdateProfile(updatedProfile);
      }
      if (onOnboardingComplete) {
        setTimeout(() => {
          onOnboardingComplete();
        }, 700);
      }
      setTimeout(() => setProfileSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setProfileError(err.message || 'Error saving profile. Please check connection and try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSavingPayment(true);
    setPaymentError(null);
    setPaymentSaved(false);

    try {
      await dueflowApi.updateProfile({
        upiId,
        beneficiaryName,
        bankName,
        accountNumber,
        routingNumber,
        paymentInstructions: instructions,
        paymentQrUrl: qrFile,
      });

      const updatedProfile: UserProfile = {
        fullName,
        email,
        preferredCurrency,
        timezone,
        upiId,
        beneficiaryName,
        bankName,
        accountNumber,
        routingNumber,
        paymentInstructions: instructions,
        paymentQrUrl: qrFile,
        gmailConnected,
        automatedRemindersEnabled: automatedReminders,
      };

      setPaymentSaved(true);
      if (onUpdateProfile) {
        onUpdateProfile(updatedProfile);
      }
      setTimeout(() => setPaymentSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save payment details:', err);
      setPaymentError(err.message || 'Error saving payment details. Please check connection and try again.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Keyboard shortcut listener to close delete confirmation modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteQrModal && !isDeletingQr) {
        setShowDeleteQrModal(false);
        setQrDeleteError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteQrModal, isDeletingQr]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localPreview = URL.createObjectURL(file);
      setQrUploadPreview(localPreview);
      setIsUploadingQr(true);
      setQrUploadSuccess(false);
      setQrDeleteSuccess(null);
      setQrDeleteError(null);
      try {
        const res = await dueflowApi.uploadQrCode(file);
        setQrFile(res.qrCodeUrl);
        setQrUploadSuccess(true);
        if (onUpdateProfile && userProfile) {
          onUpdateProfile({ ...userProfile, paymentQrUrl: res.qrCodeUrl });
        }
        setQrDeleteSuccess('Payment QR code uploaded and persisted successfully.');
        setTimeout(() => {
          setQrUploadSuccess(false);
          setQrUploadPreview(null);
        }, 2200);
        setTimeout(() => setQrDeleteSuccess(null), 3500);
      } catch (err: any) {
        console.error('Failed to upload QR code:', err);
        setQrDeleteError(err.message || 'Failed to upload QR code. Please try again.');
        setQrUploadPreview(null);
      } finally {
        setIsUploadingQr(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleConfirmDeleteQr = async () => {
    if (isDeletingQr) return;
    setIsDeletingQr(true);
    setQrDeleteError(null);

    try {
      await dueflowApi.deleteQrCode();
      setQrFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowDeleteQrModal(false);
      setQrDeleteSuccess('Payment QR code deleted successfully.');
      setTimeout(() => setQrDeleteSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error deleting payment QR code:', err);
      setQrDeleteError(err.message || 'Failed to delete payment QR code. Please try again.');
    } finally {
      setIsDeletingQr(false);
    }
  };

  const handleToggleGmail = async () => {
    if (isGmailLoading) return;
    setGmailError(null);
    setGmailSuccess(null);

    if (gmailConnected) {
      setIsGmailLoading(true);
      try {
        await dueflowApi.disconnectGmail();
        setGmailConnected(false);
        setConnectedGmailEmail(null);
        setGmailSuccess('Gmail disconnected successfully.');
        setTimeout(() => setGmailSuccess(null), 4000);
      } catch (err: any) {
        setGmailError(err?.message || 'Failed to disconnect Gmail.');
      } finally {
        setIsGmailLoading(false);
      }
    } else {
      setIsGmailLoading(true);
      try {
        const { url } = await dueflowApi.getGmailAuthUrl();
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('Google OAuth URL was not returned by server');
        }
      } catch (err: any) {
        setIsGmailLoading(false);
        setGmailError(err?.message || 'Failed to initialize Gmail OAuth. Please ensure Google OAuth credentials are configured on the backend.');
      }
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] px-6 sm:px-14 py-8 space-y-10 max-w-5xl">
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] dark:text-[#f3f6fa] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#44474d] dark:text-[#94a3b8] mt-1">
            Manage your visual appearance, currency preferences, business profile, payment details, and email connection.
          </p>
        </div>
      </section>

      {/* Guided Onboarding Banner */}
      {isOnboardingMode && (
        <div className="p-6 rounded-2xl bg-[#001126] dark:bg-[#182638] text-[#ffffff] shadow-lg border border-[#3d6562]/40 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#9ec9c4] text-[24px]">waving_hand</span>
            <h3 className="text-lg font-bold text-[#ffffff]">Welcome to DueFlow! Set up your workspace profile</h3>
          </div>
          <p className="text-xs text-[#c4c6cd] leading-relaxed max-w-2xl">
            Please enter your name or business name and choose your preferred currency. This information is used on your invoices, payment receipts, and automated email reminders. Once saved, you will be taken directly to your Dashboard.
          </p>
        </div>
      )}

      {/* Card 0: Appearance / Theme Configuration */}
      <div className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
            Appearance
          </h2>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
            Choose your interface visual theme. Preference is saved locally and instantly applies across the entire workspace.
          </p>
        </div>
        <div className="pt-2">
          <ThemeToggle variant="segmented" />
        </div>
      </div>

      {/* Card 1: Profile & Currency Selection */}
      <div id="profile-section" className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
              Profile & Currency
            </h2>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
              Configure your business details and default currency applied to invoices.
            </p>
          </div>
          <span
            className={`font-['Space_Mono'] text-[10px] uppercase px-2.5 py-1 rounded-full font-semibold self-start sm:self-auto ${
              userProfile?.onboardingCompleted
                ? 'bg-[#bfebe6] text-[#00201e] dark:bg-[#3d6562]/40 dark:text-[#9ec9c4]'
                : 'bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#ba1a1a]/30 dark:text-[#ffb4ab]'
            }`}
          >
            {userProfile?.onboardingCompleted ? 'Profile Complete' : 'Setup Required'}
          </span>
        </div>

        <div className="space-y-5">
          {/* Preferred Currency Selector */}
          <div className="p-4 rounded-xl bg-[#f0eee9]/40 dark:bg-[#101926] border border-[#001126]/5 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="preferred-currency-select"
                className="block text-[11px] font-semibold font-['Space_Mono'] uppercase tracking-wider text-[#001126] dark:text-[#f3f6fa]"
              >
                PREFERRED INVOICE CURRENCY *
              </label>
              <span className="font-['Space_Mono'] text-[10px] text-[#3d6562] dark:text-[#68b5ad] font-semibold">
                CURRENT DEFAULT: {preferredCurrency} ({preferredCurrency === 'INR' ? '₹' : '$'})
              </span>
            </div>

            <select
              id="preferred-currency-select"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value as 'INR' | 'USD')}
              className="w-full px-3.5 py-2.5 bg-[#ffffff] dark:bg-[#0c131d] text-sm text-[#001126] dark:text-[#f3f6fa] font-semibold rounded-lg border border-[#001126]/15 dark:border-white/15 focus:outline-none focus:border-[#001126] dark:focus:border-[#38bdf8] focus:ring-2 focus:ring-[#9ec9c4]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="INR">Indian Rupee (INR ₹)</option>
              <option value="USD">US Dollar (USD $)</option>
            </select>

            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
              Default currency used when creating new invoices. Existing invoices preserve their own recorded currency and are never converted or altered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                FULL NAME OR BUSINESS NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Acme Studio LLC"
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@acme.com"
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
              TIMEZONE
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
            >
              <option value="(UTC+05:30) India Standard Time (Kolkata)">
                (UTC+05:30) India Standard Time (Kolkata)
              </option>
              <option value="(UTC+00:00) Coordinated Universal Time (London)">
                (UTC+00:00) Coordinated Universal Time (London)
              </option>
              <option value="(UTC-05:00) Eastern Time (US & Canada)">
                (UTC-05:00) Eastern Time (US & Canada)
              </option>
              <option value="(UTC-08:00) Pacific Time (US & Canada)">
                (UTC-08:00) Pacific Time (US & Canada)
              </option>
            </select>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="btn-action-primary w-full sm:w-auto px-6 py-2.5 text-xs font-semibold rounded-xl self-stretch sm:self-start cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
            >
              {isSavingProfile ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Saving profile...</span>
                </>
              ) : isOnboardingMode ? (
                <>
                  <span>Save & Continue to Dashboard</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              ) : (
                <span>Save profile</span>
              )}
            </button>

            {profileSaved && (
              <span className="text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Profile changes & currency saved
              </span>
            )}

            {profileError && (
              <span className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {profileError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Payment details */}
      <div className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
            Payment details
          </h2>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
            Add the information your clients need to pay you in your chosen currency.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                UPI ID (INR PAYMENTS)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank"
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                BENEFICIARY OR BUSINESS NAME
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="e.g. Acme Studio LLC"
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
              />
            </div>
          </div>

          {/* Direct Bank Transfer */}
          <div className="space-y-2">
            <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] block">
              DIRECT BANK TRANSFER (OPTIONAL)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] dark:text-[#94a3b8] mb-1">
                  BANK NAME
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, Mumbai"
                  className="w-full px-3 py-2 bg-[#ffffff] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 focus:border-[#001126] dark:focus:border-[#38bdf8] outline-none"
                />
              </div>
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] dark:text-[#94a3b8] mb-1">
                  ACCOUNT NUMBER
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3 py-2 bg-[#ffffff] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 focus:border-[#001126] dark:focus:border-[#38bdf8] outline-none"
                />
              </div>
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] dark:text-[#94a3b8] mb-1">
                  IFSC / ROUTING / BIC
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-3 py-2 bg-[#ffffff] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 focus:border-[#001126] dark:focus:border-[#38bdf8] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div>
            <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
              PAYMENT INSTRUCTIONS
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Please include invoice number in the payment note"
              className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-transparent focus:border-[#001126] dark:focus:border-[#38bdf8] focus:bg-[#ffffff] dark:focus:bg-[#101926] outline-none"
            />
          </div>

          {/* Payment QR code */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#001126] dark:text-[#f3f6fa] block">
              Payment QR code
            </span>
            <span className="text-xs text-[#44474d] dark:text-[#94a3b8] block">
              Upload a QR image for your clients to scan when settling invoices.
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleQrUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {/* Contextual Processing State during upload */}
            {isUploadingQr || qrUploadSuccess ? (
              <QrUploadProcessingAnimation
                isUploading={isUploadingQr}
                isSuccess={qrUploadSuccess}
                previewUrl={qrUploadPreview || qrFile}
                error={qrDeleteError}
              />
            ) : qrFile ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-[#ffffff] dark:bg-[#101926] rounded-xl border border-[#001126]/10 dark:border-white/10 shadow-2xs">
                <div className="relative group shrink-0">
                  <img
                    src={qrFile}
                    alt="Payment QR Code Preview"
                    className="w-32 h-32 object-contain rounded-lg border border-[#001126]/10 dark:border-white/10 bg-[#fbf9f4] dark:bg-[#0c131d] p-1.5 shadow-2xs"
                  />
                </div>
                <div className="flex flex-col justify-between self-stretch py-1 text-center sm:text-left">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-[#001126] dark:text-[#f3f6fa]">
                      <span className="material-symbols-outlined text-[18px] text-[#3d6562] dark:text-[#68b5ad]">qr_code_scanner</span>
                      <span>Payment QR code active</span>
                    </div>
                    <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-1 max-w-sm leading-relaxed">
                      This QR code is attached to your invoices and payment reminder emails for instant scanning.
                    </p>
                  </div>

                  {/* Two clearly distinguishable actions: Replace QR code and Delete QR code */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 pt-3 border-t border-[#001126]/5 dark:border-white/10">
                    <button
                      type="button"
                      disabled={isUploadingQr || isDeletingQr}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-action-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                      title="Upload a new QR image to replace the current one"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      <span>Replace QR code</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeletingQr || isUploadingQr}
                      onClick={() => {
                        setQrDeleteError(null);
                        setShowDeleteQrModal(true);
                      }}
                      className="btn-action-danger inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#ba1a1a]/30 dark:border-[#ffb4ab]/30 text-[#ba1a1a] dark:text-[#ffb4ab] bg-transparent hover:bg-[#ba1a1a]/10 hover:border-[#ba1a1a]/50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      title="Remove this QR code from payment details"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Delete QR code</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isUploadingQr) fileInputRef.current?.click();
                }}
                className="border border-dashed border-[#001126]/20 dark:border-white/20 hover:border-[#001126]/40 dark:hover:border-white/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fbf9f4]/50 dark:bg-[#101926]/50"
              >
                <div className="w-8 h-8 rounded bg-[#f0eee9] dark:bg-[#192638] flex items-center justify-center mb-2 text-[#44474d] dark:text-[#94a3b8]">
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                </div>
                <span className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                  Upload QR image (PNG, JPEG, WebP)
                </span>
                <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#44474d]/70 dark:text-[#94a3b8]/70 mt-1">
                  MAX FILE SIZE 5MB • 1:1 ASPECT RATIO RECOMMENDED
                </span>
              </div>
            )}

            {qrDeleteSuccess && (
              <span className="text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold flex items-center gap-1.5 animate-fade-in pt-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {qrDeleteSuccess}
              </span>
            )}
            {qrDeleteError && !showDeleteQrModal && (
              <span className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold flex items-center gap-1.5 animate-fade-in pt-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {qrDeleteError}
              </span>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={handleSavePayment}
              disabled={isSavingPayment}
              className="btn-action-primary w-full sm:w-auto px-6 py-2.5 text-[11px] uppercase tracking-[0.14em] rounded-[6px] self-stretch sm:self-start cursor-pointer"
            >
              {isSavingPayment ? 'Saving payment details...' : 'Save payment details'}
            </button>

            {paymentSaved && (
              <span className="text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Payment configuration saved
              </span>
            )}

            {paymentError && (
              <span className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {paymentError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Gmail connection */}
      <div className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
            Gmail connection
          </h2>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
            Connect Gmail to send invoice reminders from your own account.
          </p>
        </div>

        <div className="p-5 bg-[#f0eee9]/40 dark:bg-[#101926] rounded-xl border border-[#001126]/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-[#3d6562] dark:bg-[#68b5ad]' : 'bg-[#c4c6cd] dark:bg-[#475569]'}`} />
              <span className="font-['Space_Mono'] text-[10px] text-[#44474d] dark:text-[#94a3b8]">
                {gmailConnected ? (connectedGmailEmail || email ? `Connected (${connectedGmailEmail || email})` : 'Connected') : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] max-w-md">
              DueFlow sends reminder emails securely directly through your personal or Google Workspace account.
            </p>
          </div>

          <button
            type="button"
            disabled={isGmailLoading}
            onClick={handleToggleGmail}
            className="btn-action-secondary px-4 py-2.5 text-xs font-semibold shrink-0 self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            {isGmailLoading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>{gmailConnected ? 'Disconnecting...' : 'Connecting...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{gmailConnected ? 'Disconnect Gmail' : 'Connect Gmail'}</span>
              </>
            )}
          </button>
        </div>

        {gmailSuccess && (
          <div className="p-3 bg-[#3d6562]/10 dark:bg-[#3d6562]/30 border border-[#3d6562]/20 rounded-lg text-xs text-[#3d6562] dark:text-[#68b5ad] font-semibold flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{gmailSuccess}</span>
          </div>
        )}
        {gmailError && (
          <div className="p-3 bg-[#ba1a1a]/10 dark:bg-[#ba1a1a]/30 border border-[#ba1a1a]/20 rounded-lg text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{gmailError}</span>
          </div>
        )}
      </div>

      {/* Card 4: Reminder preferences */}
      <div className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl border border-[#001126]/5 dark:border-white/10 p-6 sm:p-8 space-y-4 shadow-2xs">
        <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
          Reminder preferences
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#001126] dark:text-[#f3f6fa]">
              Enable automated reminder emails globally
            </h3>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8]">
              Autopilot triggers tailored reminders based on client risk rating and payment due dates.
            </p>
          </div>
          <button
            onClick={() => setAutomatedReminders(!automatedReminders)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              automatedReminders ? 'bg-[#15263c] dark:bg-[#38bdf8]' : 'bg-[#c4c6cd] dark:bg-[#475569]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#ffffff] transition-transform ${
                automatedReminders ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-3.5 bg-[#f0eee9]/40 dark:bg-[#101926] rounded-lg flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[#44474d] dark:text-[#94a3b8] mt-0.5">
            info
          </span>
          <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
            When disabled, scheduled follow-ups will be paused. Invoices marked as paid never receive reminders.
          </p>
        </div>
      </div>

      {/* Delete Payment QR Code Confirmation Dialog */}
      {showDeleteQrModal && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeletingQr) {
              setShowDeleteQrModal(false);
              setQrDeleteError(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-qr-dialog-title"
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#001126]/10 dark:border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6]/60 dark:bg-[#ffdad6]/20 text-[#ba1a1a] dark:text-[#ffb4ab] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              </div>
              <div className="space-y-1 min-w-0">
                <h3 id="delete-qr-dialog-title" className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">
                  Delete payment QR code?
                </h3>
                <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
                  Your QR code will be removed from your payment details and will no longer appear on future invoices or reminders.
                </p>
              </div>
            </div>

            {qrDeleteError && (
              <div className="p-3 rounded-lg bg-[#ffdad6]/30 border border-[#ba1a1a]/20 text-xs text-[#ba1a1a] dark:text-[#ffb4ab] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{qrDeleteError}</span>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#001126]/5 dark:border-white/10">
              <button
                type="button"
                disabled={isDeletingQr}
                onClick={() => {
                  setShowDeleteQrModal(false);
                  setQrDeleteError(null);
                }}
                className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingQr}
                onClick={handleConfirmDeleteQr}
                className="btn-action-danger inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#ba1a1a] text-white hover:bg-[#93000a] active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingQr ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete QR code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
