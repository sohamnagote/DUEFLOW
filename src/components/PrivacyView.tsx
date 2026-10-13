import React from 'react';

interface PrivacyViewProps {
  onBackToLanding: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBackToLanding }) => {
  return (
    <div className="min-h-screen w-full bg-[#fbf9f4] dark:bg-[#0c131d] font-['Hanken_Grotesk'] text-[#1b1c19] dark:text-[#f3f6fa] selection:bg-[#bfebe6] selection:text-[#00201e] flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#fbf9f4]/90 dark:bg-[#0c131d]/90 backdrop-blur-md border-b border-[#c4c6cd]/30 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBackToLanding}
              className="text-[22px] leading-[28px] font-bold tracking-tight lowercase text-[#001126] dark:text-[#f3f6fa] hover:opacity-80 transition-opacity cursor-pointer"
            >
              dueflow
            </button>
            <span className="hidden sm:inline-block text-[#c4c6cd] dark:text-white/20">/</span>
            <span className="hidden sm:inline-block font-['Space_Mono'] text-[11px] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8]">
              Privacy Policy
            </span>
          </div>

          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] hover:text-[#3d6562] dark:hover:text-[#68b5ad] transition-colors py-2 px-3 rounded-lg hover:bg-[#eae8e3]/60 dark:hover:bg-[#192638] group cursor-pointer"
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
        <div className="pb-8 border-b border-[#001126]/10 dark:border-white/10 mb-10">
          <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#3d6562] dark:text-[#68b5ad] block mb-2">
            LEGAL ARCHITECTURE • LAST UPDATED OCTOBER 2026
          </span>
          <h1 className="text-3xl sm:text-[42px] leading-tight font-bold text-[#001126] dark:text-[#f3f6fa] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-[#44474d] dark:text-[#94a3b8] mt-3 max-w-2xl leading-relaxed">
            DueFlow is engineered to help independent studios, creators, and freelancers manage invoice collections with automated dignity and total data transparency.
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-10 text-sm sm:text-base text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">1. Information We Collect</h2>
            <p>
              We collect information you provide directly when configuring your DueFlow account, including your business name, contact email address, client directory entries, invoice payment schedules, and preferred currency preferences (INR or USD).
            </p>
            <p>
              When you voluntarily connect payment receiving methods, we store your specified UPI ID, beneficiary legal name, bank account numbers, IFSC codes, and custom payment QR images solely to display them on your invoice records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">2. Gmail Integration & Google API Limited Use</h2>
            <p>
              If you choose to connect your Google account to enable 1-click reminders, DueFlow accesses your Gmail account solely to compose and transmit automated invoice reminders on your behalf directly to your clients.
            </p>
            <div className="p-4 rounded-xl bg-[#ffffff] dark:bg-[#141f2e] border border-[#001126]/10 dark:border-white/10 font-['Space_Mono'] text-xs text-[#1b1c19] dark:text-[#f3f6fa]">
              DueFlow’s use and transfer to any other app of information received from Google APIs adheres to Google API Services User Data Policy, including the Limited Use requirements. We never sell your personal data or use client email contents for advertising.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">3. Client Data Confidentiality</h2>
            <p>
              Your clients belong to you. We do not contact your clients for marketing purposes, sell contact details to third-party data brokers, or use private payment amounts for competitive indexing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">4. Currency & Financial Data Integrity</h2>
            <p>
              DueFlow preserves the authentic currency attached to each individual invoice (e.g. Indian Rupee ₹ or US Dollar $). We do not perform silent currency conversions, alter historical amounts, or expose your ledger records publicly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">5. Data Retention & Deletion</h2>
            <p>
              You may clear your directory entries, delete individual invoices, disconnect Gmail authorizations, or request complete account erasure at any time directly through the application settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">6. Contact Information</h2>
            <p>
              For privacy inquiries or data rights requests, please contact the DueFlow data security team through your registered account dashboard.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-14 pt-8 border-t border-[#001126]/10 dark:border-white/10 flex items-center justify-end">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#44474d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] transition-colors"
          >
            Read Terms of Service →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#fbf9f4] dark:bg-[#0c131d] border-t border-[#c4c6cd]/30 dark:border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          <div />

          <div className="flex items-center gap-6">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#001126] dark:text-[#f3f6fa] font-semibold tracking-[0.14em]">
              Privacy
            </span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/70 dark:text-[#94a3b8]/70 hover:text-[#001126] dark:hover:text-[#f3f6fa] transition-colors tracking-[0.14em]"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
