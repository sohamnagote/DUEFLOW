import React, { useState, useEffect } from 'react';
import { AmbientShaderCanvas } from './AmbientShaderCanvas';
import {
  signInWithGooglePopup,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  sendPasswordResetEmail,
} from '../utils/auth';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Staged entrance animation sequence:
  // Step 1: Shader already moving (Phase A)
  // Step 2: Header and Back link (t ~60ms)
  // Step 3: Welcome heading (t ~180ms)
  // Step 4: Description (t ~300ms)
  // Step 5: Login form card (t ~420ms)
  // Step 6: Google button & bottom switcher (t ~540ms)
  const [stepHeader, setStepHeader] = useState(false);
  const [stepHeading, setStepHeading] = useState(false);
  const [stepDesc, setStepDesc] = useState(false);
  const [stepForm, setStepForm] = useState(false);
  const [stepExtra, setStepExtra] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setPrefersReducedMotion(true);
      setStepHeader(true);
      setStepHeading(true);
      setStepDesc(true);
      setStepForm(true);
      setStepExtra(true);
      return;
    }

    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setPrefersReducedMotion(true);
        setStepHeader(true);
        setStepHeading(true);
        setStepDesc(true);
        setStepForm(true);
        setStepExtra(true);
      }
    };
    motionQuery.addEventListener('change', onMotionChange);

    // Staggered sequence (delays ~80-140ms between groups, total < 1.2s)
    const t1 = setTimeout(() => setStepHeader(true), 60);
    const t2 = setTimeout(() => setStepHeading(true), 180);
    const t3 = setTimeout(() => setStepDesc(true), 300);
    const t4 = setTimeout(() => setStepForm(true), 420);
    const t5 = setTimeout(() => setStepExtra(true), 540);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      await signInWithGooglePopup();
      onSignInSuccess();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err?.message || 'Google Sign-In could not be completed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      if (authMode === 'forgot') {
        await sendPasswordResetEmail(email);
        setResetSent(true);
        return;
      }

      if (authMode === 'signup') {
        await signUpWithEmailPassword(email, password, fullName);
        onSignInSuccess();
        return;
      }

      if (authMode === 'login') {
        await signInWithEmailPassword(email, password);
        onSignInSuccess();
        return;
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setAuthError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent font-['Hanken_Grotesk'] text-[#1b1c19] flex flex-col selection:bg-[#bfebe6] selection:text-[#00201e] relative overflow-hidden">
      {/* Living WebGL Ambient Aura Shader (exact same component as Landing page) */}
      <AmbientShaderCanvas opacity={0.88} fadeOnScroll={false} />

      {/* Top Header - Fades in subtly, no bottom border line */}
      <header
        className="fixed top-0 left-0 w-full z-50 bg-[#fbf9f4]/25 backdrop-blur-md transition-all duration-500 ease-out"
        style={{
          opacity: prefersReducedMotion || stepHeader ? 1 : 0,
          transform: prefersReducedMotion || stepHeader ? 'translateY(0px)' : 'translateY(-6px)',
        }}
      >
        <div className="h-20 w-full px-6 md:px-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={onBackToLanding}
              className="text-[22px] leading-[28px] font-semibold tracking-tight lowercase text-[#001126] hover:opacity-80 transition-opacity cursor-pointer"
            >
              dueflow
            </button>
            <span className="text-[#c4c6cd]/60">/</span>
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#44474d] hover:text-[#001126] transition-colors group cursor-pointer"
              title="Return to public landing page"
            >
              <span className="material-symbols-outlined text-[15px] transition-transform group-hover:-translate-x-0.5">arrow_back</span>
              <span>Back to landing page</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#001126] hover:bg-[#15263c] flex items-center justify-center transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] border border-transparent hover:border-[#001126]/20">
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login / Registration / Forgot Password Area */}
      <main className="w-full pt-28 pb-12 flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="w-full max-w-[420px] mx-auto px-4 sm:px-6 relative z-10">
          {authMode !== 'login' && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setResetSent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[#44474d] hover:text-[#001126] transition-colors font-medium cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          {/* Heading & Subtitle with staged smooth fade & upward movement */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] mb-2 tracking-tight transition-all duration-800 ease-out"
              style={{
                opacity: prefersReducedMotion || stepHeading ? 1 : 0,
                transform: prefersReducedMotion || stepHeading ? 'translateY(0px)' : 'translateY(10px)',
              }}
            >
              {authMode === 'login'
                ? 'Welcome to DueFlow'
                : authMode === 'signup'
                ? 'Create your account'
                : 'Reset your password'}
            </h1>
            <p
              className="text-sm leading-[22px] text-[#44474d] transition-all duration-600 ease-out"
              style={{
                opacity: prefersReducedMotion || stepDesc ? 1 : 0,
                transform: prefersReducedMotion || stepDesc ? 'translateY(0px)' : 'translateY(8px)',
              }}
            >
              {authMode === 'login'
                ? 'Sign in to manage your invoices and payment follow-ups.'
                : authMode === 'signup'
                ? 'Start autonomous invoice tracking and automated collections.'
                : 'Enter your email to receive recovery instructions.'}
            </p>
          </div>

          {/* Translucent Form Card with smooth entrance & shader visible underneath */}
          <div
            className="p-6 sm:p-10 rounded-2xl shadow-sm border border-[#001126]/[0.08] relative backdrop-blur-md transition-all duration-600 ease-out"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              opacity: prefersReducedMotion || stepForm ? 1 : 0,
              transform: prefersReducedMotion || stepForm ? 'translateY(0px)' : 'translateY(10px)',
            }}
          >
            {authMode === 'forgot' && resetSent ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#22D3EE]/20 mx-auto flex items-center justify-center text-[#071426]">
                  <span className="material-symbols-outlined text-[24px] text-[#071426]">mark_email_read</span>
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
                  className="w-full py-3 bg-[#071426] text-[#ffffff] text-xs font-semibold rounded-lg hover:bg-[#15263c] transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {authError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-[#b91c1c] text-xs rounded-lg flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0 text-[#b91c1c]">error</span>
                    <span>{authError}</span>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                      FULL NAME
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[6px] border border-[#001126]/12 focus:outline-none focus:border-[#071426] focus:ring-2 focus:ring-[#071426]/15 transition-all"
                      placeholder="Your full name"
                      required
                      type="text"
                      disabled={isLoading}
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
                    className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[6px] border border-[#001126]/12 focus:outline-none focus:border-[#071426] focus:ring-2 focus:ring-[#071426]/15 transition-all"
                    placeholder="you@example.com"
                    required
                    type="email"
                    disabled={isLoading}
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
                          className="font-['Space_Mono'] text-[10px] text-[#001126] hover:underline cursor-pointer"
                          onClick={() => setAuthMode('forgot')}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      className="w-full px-4 py-3 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[6px] border border-[#001126]/12 focus:outline-none focus:border-[#071426] focus:ring-2 focus:ring-[#071426]/15 transition-all"
                      placeholder="Enter your password"
                      required
                      type="password"
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  className="w-full py-3.5 bg-[#071426] text-[#ffffff] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:bg-[#15263c] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#071426]/25 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Processing...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : authMode === 'signup'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </button>

                {/* Google Sign-in & Switcher - Animated in last */}
                {authMode !== 'forgot' && (
                  <div
                    className="transition-all duration-500 ease-out"
                    style={{
                      opacity: prefersReducedMotion || stepExtra ? 1 : 0,
                      transform: prefersReducedMotion || stepExtra ? 'translateY(0px)' : 'translateY(6px)',
                    }}
                  >
                    <div className="relative flex items-center justify-center my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#001126]/10" />
                      </div>
                      <div className="relative px-3 bg-[#ffffff]/60 backdrop-blur-xs font-['Space_Mono'] text-[10px] uppercase text-[#44474d] tracking-[0.14em] rounded-sm">
                        Or
                      </div>
                    </div>

                    {/* Google Sign-in Button */}
                    <button
                      className="w-full py-3 px-4 bg-[#ffffff] text-[#1b1c19] text-sm rounded-[6px] border border-[#001126]/12 hover:bg-[#f8f9fa] hover:border-[#001126]/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#001126]/15 transition-all flex items-center justify-center gap-3 shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
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
                      <span className="font-semibold text-[#001126]">
                        {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Bottom Switcher */}
          <div
            className="mt-6 text-center space-y-2 transition-all duration-500 ease-out"
            style={{
              opacity: prefersReducedMotion || stepExtra ? 1 : 0,
              transform: prefersReducedMotion || stepExtra ? 'translateY(0px)' : 'translateY(6px)',
            }}
          >
            {authMode === 'login' ? (
              <p className="text-sm text-[#44474d]">
                New to DueFlow?{' '}
                <button
                  onClick={() => setAuthMode('signup')}
                  className="text-[#001126] font-semibold hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-sm text-[#44474d]">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthMode('login')}
                  className="text-[#001126] font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
