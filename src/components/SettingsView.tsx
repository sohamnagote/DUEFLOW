import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onUpdateProfile,
}) => {
  const [fullName, setFullName] = useState(userProfile?.fullName || 'Alex Mercer');
  const [email, setEmail] = useState(userProfile?.email || 'alex@dueflow.io');
  const [preferredCurrency, setPreferredCurrency] = useState<'INR' | 'USD'>(
    userProfile?.preferredCurrency || 'INR'
  );
  const [timezone, setTimezone] = useState(
    userProfile?.timezone || '(UTC+00:00) Coordinated Universal Time (London)'
  );

  const [upiId, setUpiId] = useState(userProfile?.upiId || 'alexmercer@okaxis');
  const [beneficiaryName, setBeneficiaryName] = useState(
    userProfile?.beneficiaryName || 'Alex Mercer Design Studio LLC'
  );
  const [bankName, setBankName] = useState(userProfile?.bankName || 'Mercury Bank, San Francisco');
  const [accountNumber, setAccountNumber] = useState(userProfile?.accountNumber || '987654321098');
  const [routingNumber, setRoutingNumber] = useState(userProfile?.routingNumber || '121000358');
  const [instructions, setInstructions] = useState(
    userProfile?.paymentInstructions || 'Please include invoice number in the payment note'
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load persisted user profile from backend database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        if (data.success && data.profile && isMounted) {
          const p = data.profile;
          setFullName(p.fullName || 'Alex Mercer');
          setEmail(p.email || 'alex@dueflow.io');
          if (p.preferredCurrency === 'USD' || p.preferredCurrency === 'INR') {
            setPreferredCurrency(p.preferredCurrency);
          }
          if (p.timezone) setTimezone(p.timezone);
          if (p.upiId) setUpiId(p.upiId);
          if (p.beneficiaryName) setBeneficiaryName(p.beneficiaryName);
          if (p.bankName) setBankName(p.bankName);
          if (p.accountNumber) setAccountNumber(p.accountNumber);
          if (p.routingNumber) setRoutingNumber(p.routingNumber);
          if (p.paymentInstructions) setInstructions(p.paymentInstructions);
          if (p.paymentQrUrl) setQrFile(p.paymentQrUrl);
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
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    const payload = {
      fullName,
      email,
      preferredCurrency,
      timezone,
    };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setProfileSaved(true);
      if (onUpdateProfile && data.profile) {
        onUpdateProfile(data.profile);
      }
      setTimeout(() => setProfileSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setProfileError(err.message || 'Network error saving profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSavingPayment(true);
    setPaymentError(null);
    setPaymentSaved(false);

    const payload = {
      upiId,
      beneficiaryName,
      bankName,
      accountNumber,
      routingNumber,
      paymentInstructions: instructions,
      paymentQrUrl: qrFile,
    };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save payment configuration');
      }

      const data = await res.json();
      setPaymentSaved(true);
      if (onUpdateProfile && data.profile) {
        onUpdateProfile(data.profile);
      }
      setTimeout(() => setPaymentSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save payment details:', err);
      setPaymentError(err.message || 'Error saving payment details.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setQrFile(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] px-6 sm:px-14 py-8 space-y-10 max-w-5xl">
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#44474d] mt-1">
            Manage your currency preferences, business profile, payment details, and email connection.
          </p>
        </div>
      </section>

      {/* Card 1: Profile & Currency Selection per Requirement 5 */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#001126]/5 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Profile & Currency
          </h2>
          <p className="text-xs text-[#44474d] mt-0.5">
            Configure your business details and default currency applied to invoices.
          </p>
        </div>

        <div className="space-y-5">
          {/* Preferred Currency Selector (Requirement 5) */}
          <div className="p-4 rounded-xl bg-[#f0eee9]/40 border border-[#001126]/5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="preferred-currency-select"
                className="block text-[11px] font-semibold font-['Space_Mono'] uppercase tracking-wider text-[#001126]"
              >
                PREFERRED INVOICE CURRENCY *
              </label>
              <span className="font-['Space_Mono'] text-[10px] text-[#3d6562] font-semibold">
                CURRENT DEFAULT: {preferredCurrency} ({preferredCurrency === 'INR' ? '₹' : '$'})
              </span>
            </div>

            <select
              id="preferred-currency-select"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value as 'INR' | 'USD')}
              className="w-full px-3.5 py-2.5 bg-[#ffffff] text-sm text-[#001126] font-semibold rounded-lg border border-[#001126]/15 focus:outline-none focus:border-[#001126] focus:ring-2 focus:ring-[#9ec9c4]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="INR">Indian Rupee (INR ₹)</option>
              <option value="USD">US Dollar (USD $)</option>
            </select>

            <p className="text-xs text-[#44474d] leading-relaxed">
              Default currency used when creating new invoices. Existing invoices preserve their own recorded currency and are never converted or altered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
                FULL NAME OR BUSINESS NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
              TIMEZONE
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
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
              className="px-6 py-2.5 bg-[#15263c] text-[#fbf9f4] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:bg-[#001126] transition-all disabled:opacity-50 self-start"
            >
              {isSavingProfile ? 'Saving profile...' : 'Save profile'}
            </button>

            {profileSaved && (
              <span className="text-xs text-[#3d6562] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Profile changes & currency saved
              </span>
            )}

            {profileError && (
              <span className="text-xs text-[#ba1a1a] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {profileError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Payment details */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#001126]/5 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Payment details
          </h2>
          <p className="text-xs text-[#44474d] mt-0.5">
            Add the information your clients need to pay you in your chosen currency.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
                UPI ID (INR PAYMENTS)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank"
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
                BENEFICIARY OR BUSINESS NAME
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
              />
            </div>
          </div>

          {/* Direct Bank Transfer */}
          <div className="space-y-2">
            <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#44474d] block">
              DIRECT BANK TRANSFER (OPTIONAL)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] mb-1">
                  BANK NAME
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#ffffff] text-xs text-[#001126] rounded border border-[#001126]/10 outline-none"
                />
              </div>
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] mb-1">
                  ACCOUNT NUMBER
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#ffffff] text-xs text-[#001126] rounded border border-[#001126]/10 outline-none"
                />
              </div>
              <div>
                <label className="block font-['Space_Mono'] text-[9px] uppercase text-[#44474d] mb-1">
                  IFSC / ROUTING / BIC
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#ffffff] text-xs text-[#001126] rounded border border-[#001126]/10 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div>
            <label className="block text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#44474d] mb-1">
              PAYMENT INSTRUCTIONS
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f0eee9]/60 text-xs text-[#001126] rounded border border-transparent focus:border-[#001126] focus:bg-[#ffffff] outline-none"
            />
          </div>

          {/* Payment QR code */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#001126] block">
              Payment QR code
            </span>
            <span className="text-xs text-[#44474d] block">
              Upload a QR image for your clients to scan when settling invoices.
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleQrUpload}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[#001126]/20 hover:border-[#001126]/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fbf9f4]/50"
            >
              {qrFile ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={qrFile} alt="Payment QR Code" className="w-28 h-28 object-contain rounded-lg shadow-2xs" />
                  <span className="text-xs text-[#3d6562] font-semibold">QR Image Loaded • Click to replace</span>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded bg-[#f0eee9] flex items-center justify-center mb-2 text-[#44474d]">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  </div>
                  <span className="text-xs font-semibold text-[#001126]">
                    Upload QR image (PNG, JPEG, WebP)
                  </span>
                  <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#44474d]/70 mt-1">
                    MAX FILE SIZE 5MB • 1:1 ASPECT RATIO RECOMMENDED
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={handleSavePayment}
              disabled={isSavingPayment}
              className="px-6 py-2.5 bg-[#15263c] text-[#fbf9f4] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:bg-[#001126] transition-all disabled:opacity-50 self-start"
            >
              {isSavingPayment ? 'Saving payment details...' : 'Save payment details'}
            </button>

            {paymentSaved && (
              <span className="text-xs text-[#3d6562] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Payment configuration saved
              </span>
            )}

            {paymentError && (
              <span className="text-xs text-[#ba1a1a] font-semibold flex items-center gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {paymentError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Gmail connection */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#001126]/5 p-6 sm:p-8 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Gmail connection
          </h2>
          <p className="text-xs text-[#44474d] mt-0.5">
            Connect Gmail to send invoice reminders from your own account.
          </p>
        </div>

        <div className="p-5 bg-[#f0eee9]/40 rounded-xl border border-[#001126]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-[#3d6562]' : 'bg-[#c4c6cd]'}`} />
              <span className="font-['Space_Mono'] text-[10px] text-[#44474d]">
                {gmailConnected ? 'Connected (alex@dueflow.io)' : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-[#44474d] max-w-md">
              DueFlow sends reminder emails securely directly through your personal or Google Workspace account.
            </p>
          </div>

          <button
            onClick={() => setGmailConnected(!gmailConnected)}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-[#ffffff] border border-[#001126]/10 rounded-lg text-xs font-semibold text-[#001126] hover:bg-[#f5f3ee] transition-all shadow-2xs shrink-0 self-start sm:self-auto"
          >
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
          </button>
        </div>
      </div>

      {/* Card 4: Reminder preferences */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#001126]/5 p-6 sm:p-8 space-y-4 shadow-2xs">
        <h2 className="text-lg font-bold text-[#001126]">
          Reminder preferences
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#001126]">
              Enable automated reminder emails globally
            </h3>
            <p className="text-xs text-[#44474d]">
              Autopilot triggers tailored reminders based on client risk rating and payment due dates.
            </p>
          </div>
          <button
            onClick={() => setAutomatedReminders(!automatedReminders)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              automatedReminders ? 'bg-[#15263c]' : 'bg-[#c4c6cd]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#ffffff] transition-transform ${
                automatedReminders ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-3.5 bg-[#f0eee9]/40 rounded-lg flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[#44474d] mt-0.5">
            info
          </span>
          <p className="text-xs text-[#44474d] leading-relaxed">
            When disabled, scheduled follow-ups will be paused. Invoices marked as paid never receive reminders.
          </p>
        </div>
      </div>
    </div>
  );
};
