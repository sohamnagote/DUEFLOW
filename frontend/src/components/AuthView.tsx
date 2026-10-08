import React, { useState } from 'react';
import { ArrowRight, Lock, Zap, ShieldCheck, User } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

interface AuthViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToApp: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onBackToApp,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!supabase) {
        setErrorMessage('Google authentication requires Supabase environment credentials (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY).');
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
          throw new Error('Google provider is not enabled in your Supabase dashboard. Enable Google under Authentication > Providers in the Supabase Dashboard.');
        }
        throw error;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive password reset instructions.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
      }
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        const res = await api.signup({
          email: email.trim(),
          password,
          full_name: name.trim() || undefined,
          business_name: businessName.trim() || undefined,
        });
        if (supabase && res.token) {
          await supabase.auth.signInWithPassword({ email: email.trim(), password }).catch(() => {});
        }
        onLoginSuccess(res.user);
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        if (supabase && res.token) {
          await supabase.auth.signInWithPassword({ email: email.trim(), password }).catch(() => {});
        }
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-[#cac6ff]">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-5 sm:py-8 flex items-center justify-between">
        <div 
          onClick={onBackToApp}
          className="flex flex-col cursor-pointer group"
        >
          <span className="text-[#1a1b22] font-bold text-[22px] tracking-tight">
            DueFlow
          </span>
          <span className="font-label-caps text-[10px] uppercase text-[#747878] tracking-[0.14em] mt-0.5">
            AUTOMATED INVOICE FOLLOW-UP
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBackToApp}
            className="text-xs text-[#444748] hover:text-[#1a1b22] font-semibold transition-colors py-2 px-3 rounded-lg hover:bg-[#f4f2fc] cursor-pointer"
          >
            Back to DueFlow
          </button>
          <div className="w-9 h-9 rounded-full bg-[#1c1b1b] flex items-center justify-center text-white shrink-0">
            <User size={16} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold text-[#1a1b22] tracking-tight leading-tight mb-2">
          WELCOME TO DUEFLOW.
        </h1>

        <p className="text-sm text-[#444748] mb-6">
          {isSignUp 
            ? 'Create an account to automate your invoice reminders.'
            : 'Sign in to manage your invoices and automated follow-ups.'}
        </p>

        {/* Real Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-[#f7f7f8] text-[#1a1b22] border border-[#e3e1ea] py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mb-4"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-[#e3e1ea]"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-[#747878] font-medium">or continue with email</span>
          <div className="flex-grow border-t border-[#e3e1ea]"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  className="w-full px-4 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
                />
              </div>

              <div>
                <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                  BUSINESS NAME
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. DueFlow Design Studio"
                  className="w-full px-4 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
                />
              </div>
            </>
          )}

          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1 tracking-wider">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@agency.com"
              className="w-full px-4 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22] placeholder-[#747878]"
            />
          </div>

          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1 tracking-wider">
              PASSWORD
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
            />
          </div>

          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#747878] hover:text-[#1a1b22] transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-md">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-[#1c1b1b] disabled:opacity-50 text-white py-3 px-4 rounded-lg font-label-caps text-[12px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log in'}</span>
            <ArrowRight size={14} />
          </button>

          <div className="text-center text-xs text-[#747878] pt-2">
            <span>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="underline font-semibold text-[#1a1b22] hover:text-[#5b598b] cursor-pointer"
            >
              {isSignUp ? 'Log in' : 'Create account'}
            </button>
          </div>
        </form>
      </main>

      {/* Footer Info & Security Badges */}
      <footer className="w-full max-w-7xl mx-auto px-8 md:px-12 py-8 border-t border-[#e3e1ea]">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 mb-6 font-label-caps text-[11px] uppercase tracking-[0.12em] text-[#747878]">
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-[#5b598b]" />
            <span>256-BIT FINANCIAL ENCRYPTION</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-[#5b598b]" />
            <span>AUTOMATED NOTIFICATIONS</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-[#5b598b]" />
            <span>SECURE INVOICE MANAGEMENT</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-[#747878] gap-2">
          <span>© 2024 DUEFLOW. ALL RIGHTS RESERVED.</span>
          <span className="font-medium text-[#444748]">Encrypted &amp; Automated</span>
        </div>
      </footer>
    </div>
  );
};
