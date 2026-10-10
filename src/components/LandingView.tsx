import React from 'react';
import { AmbientShaderCanvas } from './AmbientShaderCanvas';

interface LandingViewProps {
  onSignInClick: () => void;
  onGetStartedClick: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSignInClick,
  onGetStartedClick,
}) => {
  return (
    <div className="relative w-full min-h-screen bg-[#fbf9f4] font-['Hanken_Grotesk'] text-[#1b1c19] antialiased selection:bg-[#bfebe6] selection:text-[#00201e]">
      {/* Living WebGL Ambient Aura Shader (smooth animated loop with scroll fade-away) */}
      <AmbientShaderCanvas opacity={0.85} fadeOnScroll={true} />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fbf9f4]/85 backdrop-blur-xl border-b border-[#c4c6cd]/30">
        <div className="h-20 w-full px-6 md:px-14 flex items-center justify-between">
          <a
            className="text-[22px] leading-[28px] font-semibold tracking-tight lowercase text-[#001126] hover:opacity-80 transition-opacity"
            href="#"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            dueflow
          </a>
          <div className="flex items-center gap-7">
            <nav className="flex items-center gap-7">
              <button
                onClick={onSignInClick}
                className="text-sm leading-[22px] text-[#44474d] hover:text-[#1b1c19] transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={onGetStartedClick}
                className="text-sm leading-[22px] text-[#44474d] hover:text-[#1b1c19] transition-colors"
              >
                Get started
              </button>
            </nav>
            <div
              onClick={onSignInClick}
              className="w-8 h-8 rounded-full bg-[#001126] flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20 bg-transparent min-h-screen relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col w-full relative min-h-[calc(100vh-5rem)] justify-between overflow-hidden select-none">
          <div className="relative z-10 w-full max-w-4xl mx-auto px-6 md:px-14 py-16 md:py-28 flex flex-col items-center text-center my-auto">
            {/* Eyebrow */}
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.28em] text-[#44474d]/75 mb-6 md:mb-8">
              Invoice follow-ups, simplified
            </span>

            {/* Hero Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-[56px] md:leading-[60px] font-extrabold text-[#001126] tracking-tight uppercase leading-[0.98] max-w-3xl">
              Get paid.<br className="hidden sm:inline" /> Without the chasing.
            </h1>

            {/* Summary */}
            <p className="text-sm sm:text-base leading-[22px] text-[#44474d] max-w-md mx-auto mt-6 leading-relaxed">
              Create invoices, schedule reminders, and send professional follow-up emails through Gmail.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 mt-8 md:mt-10">
              <button
                onClick={onGetStartedClick}
                className="bg-[#15263c] text-[#fbf9f4] px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-[#001126] transition-all duration-200 shadow-sm active:scale-[0.98]"
              >
                Get started
              </button>
              <button
                onClick={onSignInClick}
                className="text-[#44474d] hover:text-[#001126] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Three-Step Workflow */}
        <section className="w-full border-t border-[#c4c6cd]/30 bg-[#fbf9f4]/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
              {/* Step 01 */}
              <div className="flex flex-col pt-2 border-t md:border-t-0 md:pt-0 border-[#c4c6cd]/30 first:border-t-0 first:pt-0">
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/60 tracking-[0.2em] mb-4">
                  01
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Create invoices
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  Keep client details, invoice amounts, and due dates organized in one place.
                </p>
              </div>

              {/* Step 02 */}
              <div className="flex flex-col pt-8 md:pt-0 border-t md:border-t-0 md:border-l md:pl-10 border-[#c4c6cd]/30">
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/60 tracking-[0.2em] mb-4">
                  02
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Set your schedule
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  Choose when payment reminders should be sent before, on, or after the due date.
                </p>
              </div>

              {/* Step 03 */}
              <div className="flex flex-col pt-8 md:pt-0 border-t md:border-t-0 md:border-l md:pl-10 border-[#c4c6cd]/30">
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/60 tracking-[0.2em] mb-4">
                  03
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Follow up automatically
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  DueFlow sends professional reminder emails through your connected Gmail account, with the invoice PDF attached.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Compact Feature Section */}
        <section className="w-full border-t border-[#c4c6cd]/30 bg-[#fbf9f4]">
          <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-28">
            <div className="mb-12 md:mb-16">
              <h2 className="text-[28px] sm:text-[38px] leading-[34px] sm:leading-[44px] font-bold text-[#001126] tracking-tight">
                Less chasing. More time for your work.
              </h2>
            </div>
            <div className="divide-y divide-[#c4c6cd]/30">
              {/* Feature 1 */}
              <div className="py-8 md:py-9 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline">
                <div className="md:col-span-4">
                  <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                    Invoice tracking
                  </h3>
                </div>
                <div className="md:col-span-8">
                  <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                    See which invoices are paid, outstanding, or overdue.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="py-8 md:py-9 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline">
                <div className="md:col-span-4">
                  <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                    Personalized reminders
                  </h3>
                </div>
                <div className="md:col-span-8">
                  <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                    Customize reminder timing and email wording to suit your clients.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="py-8 md:py-9 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline">
                <div className="md:col-span-4">
                  <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                    Payment details, included
                  </h3>
                </div>
                <div className="md:col-span-8">
                  <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                    Add your payment instructions and QR code to help clients understand how to pay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Final Call to Action */}
        <section className="w-full border-t border-[#c4c6cd]/30 bg-[#fbf9f4]/90 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-6 md:px-14 py-24 md:py-32 flex flex-col items-center text-center">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.28em] text-[#44474d]/70 mb-5">
              YOUR WORK. YOUR TERMS.
            </span>
            <h2 className="text-[28px] sm:text-[38px] leading-tight font-bold text-[#001126] tracking-tight uppercase mb-4">
              Get back to the work that matters.
            </h2>
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={onGetStartedClick}
                className="bg-[#15263c] text-[#fbf9f4] px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-[#001126] transition-all duration-200 shadow-sm active:scale-[0.98]"
              >
                GET STARTED
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#fbf9f4] border-t border-[#c4c6cd]/30 relative z-10">
        <div className="w-full px-6 md:px-14 py-12 flex flex-col sm:flex-row items-center justify-end gap-4">
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
