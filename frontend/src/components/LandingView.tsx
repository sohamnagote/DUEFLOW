import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, User, Sparkles, Shield, Zap, HelpCircle } from 'lucide-react';

interface LandingViewProps {
  onEnterApp: (targetTab?: 'dashboard' | 'invoices') => void;
  onOpenLogin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterApp,
  onOpenLogin,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [showWaitlistSuccess, setShowWaitlistSuccess] = useState(false);
  const [activeModal, setActiveModal] = useState<'pricing' | 'howItWorks' | 'legal' | null>(null);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setShowWaitlistSuccess(true);
    // After 1.5s, guide user directly into app
    setTimeout(() => {
      onEnterApp('dashboard');
    }, 1200);
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md text-body-md min-h-screen flex flex-col antialiased selection:bg-[#cac6ff]">
      {/* 1. Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e3e1ea]">
        <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Brand */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col text-left cursor-pointer group"
          >
            <span className="font-headline-md text-headline-md tracking-tight text-primary">
              DueFlow
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
              Automated Invoice Follow-Up
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <button
              onClick={() => setActiveModal('howItWorks')}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Product
            </button>
            <button
              onClick={() => setActiveModal('pricing')}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => onEnterApp('dashboard')}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => onEnterApp('invoices')}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Invoices
            </button>
            <button
              onClick={onOpenLogin}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Login
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => onEnterApp('dashboard')}
              className="inline-flex items-center justify-center bg-primary text-on-primary font-body-sm text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 min-h-[40px] rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <span className="hidden sm:inline">Start Using DueFlow</span>
              <span className="sm:hidden">Open App</span>
            </button>
            <button
              onClick={onOpenLogin}
              title="Sign In"
              aria-label="User sign in"
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 cursor-pointer text-white hover:bg-neutral-800 transition-colors"
            >
              <User size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="w-full pt-16 sm:pt-20 bg-surface-container-lowest flex-1">
        <div className="flex flex-col w-full">
          {/* Hero Section */}
          <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28 flex flex-col justify-start">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="font-label-caps text-[11px] sm:text-xs text-[#5b598b] font-bold tracking-[0.16em] uppercase inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5b598b] animate-pulse"></span>
                BUILT FOR MODERN FREELANCERS &amp; AGENCIES
              </span>
            </div>

            {/* Monumental Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[7.25rem] font-extrabold tracking-[-0.05em] text-[#1a1b22] max-w-6xl leading-[1.0] sm:leading-[0.9] text-left">
              Get paid on time.<br />
              <span className="text-[#5b598b] font-extrabold">Zero awkward DMs.</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-xl md:text-2xl text-[#444748] max-w-2xl mt-6 sm:mt-8 mb-8 sm:mb-10 leading-relaxed font-normal text-left">
              Send your invoices and let automated reminders do the follow-up work for you. Polite, scheduled reminders via email and WhatsApp that help you get paid faster.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
              <button
                onClick={() => onEnterApp('dashboard')}
                className="inline-flex items-center justify-center bg-black hover:bg-neutral-800 text-white font-body-md text-sm font-semibold px-7 py-3.5 min-h-[48px] rounded-lg transition-all shadow-xs cursor-pointer active:scale-[0.98] w-full sm:w-auto"
              >
                Get Paid Faster →
              </button>

              <button
                onClick={() => setActiveModal('howItWorks')}
                className="inline-flex items-center justify-center gap-2 text-[#1a1b22] font-body-md text-sm font-semibold hover:text-[#5b598b] transition-colors bg-[#f4f2fc] hover:bg-[#e8e7f0] px-5 py-3.5 min-h-[48px] rounded-lg border border-[#e3e1ea] cursor-pointer w-full sm:w-auto"
              >
                <span>How it works</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {/* Quiet Editorial Manifesto Section */}
          <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-28 border-t border-[#e3e1ea]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-3">
                <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-[0.25em] block font-bold">
                  OUR COMMITMENT
                </span>
                <span className="font-label-num text-xs text-[#5b598b] block mt-2 font-semibold">
                  Professional Payment Follow-Up
                </span>
              </div>

              <div className="lg:col-span-9 border-t lg:border-t-0 lg:border-l border-[#e3e1ea] pt-8 lg:pt-0 lg:pl-16">
                <blockquote className="font-headline-md text-2xl lg:text-[2rem] lg:leading-[1.3] text-[#1a1b22] tracking-tight font-normal">
                  &ldquo;You did the work. Getting paid should be straightforward and stress-free. We handle the follow-ups with polite, professional reminders so you always get paid on time.&rdquo;
                </blockquote>
              </div>
            </div>
          </section>

          {/* Bottom Editorial CTA Section */}
          <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-28 border-t border-[#e3e1ea]">
            <div className="max-w-3xl">
              <h2 className="font-display-xl text-4xl sm:text-6xl lg:text-[4.5rem] tracking-[-0.04em] text-[#1a1b22] leading-[0.95] mb-6">
                Never lose track of unpaid invoices.
              </h2>
              <p className="font-body-lg text-base md:text-lg text-[#444748] mb-8 max-w-xl">
                Join freelancers, agencies, and businesses getting their invoices cleared on time with automated follow-ups.
              </p>

              {!showWaitlistSuccess ? (
                <form
                  onSubmit={handleWaitlistSubmit}
                  className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-lg"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter your work email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 bg-white border border-[#e3e1ea] px-4 py-3 rounded-lg text-sm text-[#1a1b22] placeholder:text-[#747878] focus:outline-none focus:border-[#5b598b] transition-colors"
                  />
                  <button
                    type="submit"
                    className="bg-black text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer active:scale-[0.98]"
                  >
                    Start For Free
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-[#eeedf6] border border-[#e3e1ea] rounded-lg max-w-lg animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-[#1a1b22]">
                    <CheckCircle2 size={18} className="text-[#5b598b]" />
                    <span className="text-sm font-semibold">Priority access requested.</span>
                  </div>
                  <p className="text-xs text-[#444748] mt-1 pl-6">
                    Launching your clean DueFlow workspace now...
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full bg-white border-t border-[#e3e1ea] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#747878]">
          <p className="text-center sm:text-left">
            © 2025 DueFlow. Simple invoice follow-up.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1a1b22] transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1a1b22] transition-colors cursor-pointer"
            >
              Terms of Service
            </a>
            <button onClick={() => setActiveModal('howItWorks')} className="hover:text-[#1a1b22] transition-colors cursor-pointer">
              Security
            </button>
            <a href="mailto:support@dueflow.in" className="hover:text-[#1a1b22] transition-colors cursor-pointer">
              Support
            </a>
          </div>
        </div>
      </footer>

      {/* Modal: How It Works */}
      {activeModal === 'howItWorks' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-[#e3e1ea]">
            <h3 className="text-xl font-bold text-[#1a1b22] mb-2">How DueFlow Works</h3>
            <p className="text-xs text-[#444748] mb-6">
              Set the invoice once. Let automated reminders handle follow-ups until you get paid.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#f4f2fc] rounded-lg">
                <span className="font-label-caps text-[10px] text-[#5b598b] font-bold block mb-0.5">1. ADD YOUR INVOICE</span>
                <p className="text-[#1a1b22]">Enter the client name, amount, due date, and your payment details (Bank or UPI ID).</p>
              </div>

              <div className="p-3 bg-[#f4f2fc] rounded-lg">
                <span className="font-label-caps text-[10px] text-[#5b598b] font-bold block mb-0.5">2. AUTOMATIC REMINDERS</span>
                <p className="text-[#1a1b22]">Polite reminder emails sent before the due date, on the due date, and after if unpaid.</p>
              </div>

              <div className="p-3 bg-[#f4f2fc] rounded-lg">
                <span className="font-label-caps text-[10px] text-[#5b598b] font-bold block mb-0.5">3. STOPS ONCE PAID</span>
                <p className="text-[#1a1b22]">One click on &ldquo;Mark as Paid&rdquo; stops all future reminders right away.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#e3e1ea] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 min-h-[44px] sm:min-h-0 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] text-center cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onEnterApp('dashboard');
                }}
                className="px-5 py-2.5 min-h-[44px] sm:min-h-0 text-xs font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 text-center cursor-pointer active:scale-[0.98]"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pricing */}
      {activeModal === 'pricing' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-xl font-bold text-[#1a1b22] mb-1">Simple, Transparent Pricing</h3>
            <p className="text-xs text-[#444748] mb-6">Designed specifically for freelancers, consultants, and agencies.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#e3e1ea] p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="font-label-caps text-[10px] uppercase text-[#747878] font-bold">STARTER PLAN</span>
                  <div className="text-2xl font-extrabold text-[#1a1b22] mt-1 mb-2">₹0 <span className="text-xs font-normal text-[#747878]">/ Free</span></div>
                  <ul className="text-xs text-[#444748] space-y-1.5">
                    <li>✓ Up to 5 active invoices</li>
                    <li>✓ Automated email reminders</li>
                    <li>✓ Direct UPI and bank payment details</li>
                    <li>✓ Mark invoices paid with one click</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    onEnterApp('dashboard');
                  }}
                  className="w-full mt-4 bg-black text-white text-xs font-semibold py-2.5 min-h-[44px] rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  Start Free
                </button>
              </div>

              <div className="border border-[#5b598b] bg-[#f4f2fc] p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="font-label-caps text-[10px] uppercase text-[#5b598b] font-bold">PRO PLAN</span>
                  <div className="text-2xl font-extrabold text-[#1a1b22] mt-1 mb-2">₹299 <span className="text-xs font-normal text-[#747878]">/ month</span></div>
                  <ul className="text-xs text-[#444748] space-y-1.5">
                    <li>✓ Unlimited client invoices</li>
                    <li>✓ WhatsApp and Email reminders</li>
                    <li>✓ Custom reminder templates</li>
                    <li>✓ Fast and reliable email delivery</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    onEnterApp('dashboard');
                  }}
                  className="w-full mt-4 bg-[#5b598b] text-white text-xs font-semibold py-2.5 min-h-[44px] rounded-lg hover:bg-[#4a4878] transition-colors cursor-pointer active:scale-[0.98]"
                >
                  Start Pro Trial
                </button>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setActiveModal(null)}
                className="text-xs text-[#747878] hover:text-[#1a1b22] py-2 px-4 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
