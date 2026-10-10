import React, { useState } from 'react';

interface SignInViewProps {
  onSignInSuccess: () => void;
  onBackToLanding: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

export const SignInView: React.FC<SignInViewProps> = ({
  onSignInSuccess,
  onBackToLanding,
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('alex@dueflow.io');
  const [password, setPassword] = useState('••••••••••••');
  const [fullName, setFullName] = useState('Alex Mercer');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'forgot') {
      setResetSent(true);
      return;
    }
    onSignInSuccess();
  };

  return (
    <div className="w-full min-h-screen bg-[#fbf9f4] font-['Hanken_Grotesk'] text-[#1b1c19] flex flex-col justify-between selection:bg-[#bfebe6] selection:text-[#00201e] relative overflow-hidden">
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fbf9f4]/85 backdrop-blur-xl border-b border-[#c4c6cd]/30">
        <div className="h-20 w-full px-6 md:px-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={onBackToLanding}
              className="text-[22px] leading-[28px] font-semibold tracking-tight lowercase text-[#001126] hover:opacity-80 transition-opacity"
            >
              dueflow
            </button>
            <span className="text-[#c4c6cd]">/</span>
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#44474d] hover:text-[#001126] transition-colors group"
              title="Return to public landing page"
            >
              <span className="material-symbols-outlined text-[15px] transition-transform group-hover:-translate-x-0.5">arrow_back</span>
              <span>Back to landing page</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#001126] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login / Registration / Forgot Password Area */}
      <main className="w-full pt-28 pb-12 flex-1 flex flex-col items-center justify-center relative">
        {/* Ambient blurred gradient aura in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[600px] h-[500px] sm:h-[600px] rounded-full blur-[120px] opacity-40 pointer-events-none bg-gradient-to-tr from-[#9EC9C4] via-[#E98F7B] to-[#D9D0E8]" />

        {/* Decorative dot-matrix in top right */}
        <div className="absolute top-28 right-12 hidden md:grid grid-cols-3 gap-2 opacity-30 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
        </div>

        <div className="w-full max-w-[420px] mx-auto px-4 sm:px-6 relative z-10">
          {authMode !== 'login' && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setResetSent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[#44474d] hover:text-[#001126] transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          {/* Eyebrow & Titles */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] mb-2 tracking-tight">
              {authMode === 'login'
                ? 'Welcome to Dueflow'
                : authMode === 'signup'
                ? 'Create your account'
                : 'Reset your password'}
            </h1>
            <p className="text-sm leading-[22px] text-[#44474d]">
              {authMode === 'login'
                ? 'Sign in to manage your invoices and payment follow-ups.'
                : authMode === 'signup'
                ? 'Start autonomous invoice tracking and automated collections.'
                : 'Enter your email to receive recovery instructions.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-[#fbf9f4]/75 backdrop-blur-md p-6 sm:p-10 rounded-xl shadow-xs border border-[#001126]/[0.08] relative">
            {authMode === 'forgot' && resetSent ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#bfebe6] mx-auto flex items-center justify-center text-[#00201e]">
                  <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
                </div>
                <h3 className="text-base font-bold text-[#001126]">Check your inbox</h3>
                <p className="text-xs text-[#44474d] leading-relaxed">
                  We sent instructions to <span className="font-semibold text-[#001126]">{email}</span>. Click the link inside to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setResetSent(false);
                  }}
                  className="w-full py-3 bg-[#001126] text-[#ffffff] text-xs font-semibold rounded-lg hover:bg-[#15263c]"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                      FULL NAME
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[4px] border border-[#001126]/10 focus:outline-none focus:border-[#001126] focus:ring-4 focus:ring-[#9EC9C4]/25 transition-all"
                      placeholder="Alex Mercer"
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                    EMAIL ADDRESS
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[4px] border border-[#001126]/10 focus:outline-none focus:border-[#001126] focus:ring-4 focus:ring-[#9EC9C4]/25 transition-all"
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password Input (Hidden on forgot password) */}
                {authMode !== 'forgot' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                        PASSWORD
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          className="font-['Space_Mono'] text-[10px] text-[#001126] hover:underline"
                          onClick={() => setAuthMode('forgot')}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[4px] border border-[#001126]/10 focus:outline-none focus:border-[#001126] focus:ring-4 focus:ring-[#9EC9C4]/25 transition-all"
                      placeholder="Enter your password"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  className="w-full py-3.5 bg-[#001126] text-[#ffffff] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:opacity-95 active:scale-[0.99] transition-all shadow-sm"
                  type="submit"
                >
                  {authMode === 'login'
                    ? 'Sign In'
                    : authMode === 'signup'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </button>

                {/* Divider (Only on login or signup) */}
                {authMode !== 'forgot' && (
                  <>
                    <div className="relative flex items-center justify-center my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#001126]/10" />
                      </div>
                      <div className="relative px-3 bg-[#fbf9f4] font-['Space_Mono'] text-[10px] uppercase text-[#44474d] tracking-[0.14em]">
                        Or
                      </div>
                    </div>

                    {/* Google Sign-in */}
                    <button
                      className="w-full py-3 px-4 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[4px] border border-[#001126]/10 hover:bg-[#f5f3ee] transition-all flex items-center justify-center gap-3 shadow-2xs"
                      type="button"
                      onClick={onSignInSuccess}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      <span className="font-semibold text-[#001126]">Continue with Google</span>
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Bottom Switcher */}
          <div className="mt-6 text-center space-y-2">
            {authMode === 'login' ? (
              <p className="text-sm text-[#44474d]">
                New to DueFlow?{' '}
                <button
                  onClick={() => setAuthMode('signup')}
                  className="text-[#001126] font-semibold hover:underline"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-sm text-[#44474d]">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthMode('login')}
                  className="text-[#001126] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Editorial Footer: DUEFLOW text removed from bottom-left corner per Requirement 1! */}
      <footer className="w-full bg-[#fbf9f4] border-t border-[#c4c6cd]/30 py-8">
        <div className="w-full px-6 md:px-14 flex items-center justify-between">
          <div />

          {/* Privacy and Terms links open in new browser tabs per Requirement 3 */}
          <div className="flex items-center gap-6">
            <a
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/70 hover:text-[#001126] transition-colors tracking-[0.14em]"
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
            <a
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/70 hover:text-[#001126] transition-colors tracking-[0.14em]"
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
