import React from 'react';

interface TermsViewProps {
  onBackToLanding: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBackToLanding }) => {
  return (
    <div className="min-h-screen w-full bg-[#fbf9f4] font-['Hanken_Grotesk'] text-[#1b1c19] selection:bg-[#bfebe6] selection:text-[#00201e] flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#fbf9f4]/90 backdrop-blur-md border-b border-[#c4c6cd]/30">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBackToLanding}
              className="text-[22px] leading-[28px] font-bold tracking-tight lowercase text-[#001126] hover:opacity-80 transition-opacity"
            >
              dueflow
            </button>
            <span className="hidden sm:inline-block text-[#c4c6cd]">/</span>
            <span className="hidden sm:inline-block font-['Space_Mono'] text-[11px] uppercase tracking-wider text-[#44474d]">
              Terms of Service
            </span>
          </div>

          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#001126] hover:text-[#3d6562] transition-colors py-2 px-3 rounded-lg hover:bg-[#eae8e3]/60 group"
          >
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span>Back to landing page</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 sm:px-10 py-12 md:py-16 w-full flex-1">
        {/* Header Block */}
        <div className="pb-8 border-b border-[#001126]/10 mb-10">
          <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#3d6562] block mb-2">
            TERMS & CONDITIONS • EFFECTIVE OCTOBER 2026
          </span>
          <h1 className="text-3xl sm:text-[42px] leading-tight font-bold text-[#001126] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm sm:text-base text-[#44474d] mt-3 max-w-2xl leading-relaxed">
            Please read these terms carefully before utilizing the DueFlow invoice tracking and reminder automation platform.
          </p>
        </div>

        {/* Terms Body */}
        <div className="space-y-10 text-sm sm:text-base text-[#44474d] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">1. Agreement to Terms</h2>
            <p>
              By accessing or using DueFlow, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must not use our software or automated reminder services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">2. Description of Service</h2>
            <p>
              DueFlow provides autonomous ledger tools, invoice generation, client tracking, and scheduled email notifications to help businesses recover outstanding balances. DueFlow does not act as an escrow agent, financial institution, or debt collection agency.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">3. Invoicing and Currency Accuracy</h2>
            <p>
              Users are responsible for ensuring invoice quantities, client contact details, taxes, payment instructions, and currencies (INR or USD) are legally accurate and properly documented. DueFlow does not convert funds or guarantee that recipients will pay.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">4. Authorized Email Communication</h2>
            <p>
              You represent and warrant that you possess the necessary business relationship and authorization to email invoice notifications to your specified client addresses. You agree not to use DueFlow for unsolicited spam, bulk marketing, or harassment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">5. Limitation of Liability</h2>
            <p>
              DueFlow is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. In no event shall DueFlow be liable for any indirect, incidental, special, or consequential damages resulting from lost profits, email delivery failures, or third-party bank settlement delays.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126]">6. Termination</h2>
            <p>
              You may terminate your account at any time. We reserve the right to suspend accounts that violate these terms or engage in abusive emailing practices.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-14 pt-8 border-t border-[#001126]/10 flex items-center justify-end">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#44474d] hover:text-[#001126] transition-colors"
          >
            Read Privacy Policy →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#fbf9f4] border-t border-[#c4c6cd]/30 py-8">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          <div />

          <div className="flex items-center gap-6">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/70 hover:text-[#001126] transition-colors tracking-[0.14em]"
            >
              Privacy
            </a>
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#001126] font-semibold tracking-[0.14em]">
              Terms
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
