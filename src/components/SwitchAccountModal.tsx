import React, { useState } from 'react';
import { signInWithGooglePopup, signInWithEmailPassword, signOutUser } from '../utils/auth';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: {
    name: string;
    email: string;
  };
  onAccountSwitched: () => void;
}

export const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onAccountSwitched,
}) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSwitch = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Sign out current session to ensure clean boundary
      await signOutUser();
      // Prompt account selection
      await signInWithGooglePopup('select_account');
      onAccountSwitched();
      onClose();
    } catch (err: any) {
      console.error('Account switch failed:', err);
      setError(err?.message || 'Could not switch accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await signOutUser();
      await signInWithEmailPassword(email, password);
      onAccountSwitched();
      onClose();
    } catch (err: any) {
      console.error('Email sign in failed:', err);
      setError(err?.message || 'Failed to authenticate with provided credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-[#001126]/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">Switch account</h3>
            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-0.5">
              Choose an account or log in with another email.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] p-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current Active Account Box */}
        <div className="p-3.5 bg-[#fbf9f4] dark:bg-[#0c131d] rounded-xl border border-[#001126]/10 dark:border-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#74777d] dark:text-[#94a3b8] mb-2 font-['Space_Mono']">
            Current session
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#001126] dark:bg-white/10 text-[#ffffff] flex items-center justify-center font-bold text-sm shrink-0">
                {(currentAccount.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa] truncate">
                  {currentAccount.name || 'Current User'}
                </p>
                <p className="text-xs text-[#44474d] dark:text-[#94a3b8] font-['Space_Mono'] truncate">
                  {currentAccount.email || 'No email'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#15263c] dark:text-[#60a5fa] bg-[#15263c]/10 dark:bg-blue-950/50 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15263c] dark:bg-[#60a5fa]" />
              Active
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#ba1a1a]/10 dark:bg-red-950/40 border border-[#ba1a1a]/20 dark:border-red-500/20 rounded-lg text-xs text-[#ba1a1a] dark:text-[#f87171]">
            {error}
          </div>
        )}

        {/* Switch Actions */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSwitch}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#ffffff] dark:bg-[#192638] hover:bg-[#f5f3ee] dark:hover:bg-[#203148] text-[#1b1c19] dark:text-[#f3f6fa] text-xs font-semibold rounded-lg border border-[#001126]/15 dark:border-white/10 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting Google...' : 'Use another Google account'}</span>
          </button>

          {!showEmailForm ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#fbf9f4] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203148] text-[#001126] dark:text-[#f3f6fa] text-xs font-semibold rounded-lg border border-[#001126]/10 dark:border-white/10 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#44474d] dark:text-[#94a3b8]">mail</span>
              <span>Use another email & password</span>
            </button>
          ) : (
            <form onSubmit={handleEmailSwitch} className="p-4 bg-[#fbf9f4] dark:bg-[#0c131d] rounded-xl border border-[#001126]/10 dark:border-white/10 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#44474d] dark:text-[#94a3b8] mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs bg-[#ffffff] dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#44474d] dark:text-[#94a3b8] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-[#ffffff] dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-action-primary py-2 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  {isLoading ? 'Signing in...' : 'Sign in to account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="btn-action-secondary px-3 py-2 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="pt-2 flex justify-end border-t border-[#001126]/5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
