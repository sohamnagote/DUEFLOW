import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans antialiased selection:bg-[#cac6ff]">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-[#e2e8f0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 text-[#0f172a] hover:opacity-80 transition-opacity"
          >
            <span className="font-extrabold text-xl tracking-tight">DueFlow</span>
            <span className="text-xs text-[#64748b] hidden sm:inline-block border-l border-[#cbd5e1] pl-2.5 font-medium">
              Legal &amp; Privacy
            </span>
          </a>

          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a] bg-[#f1f5f9] hover:bg-[#e2e8f0] px-3.5 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-12 shadow-xs space-y-8">
          {/* Page Header */}
          <div className="border-b border-[#f1f5f9] pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-4 border border-emerald-200">
              <Shield size={13} />
              <span>Official Privacy Policy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-[#64748b] mt-2">
              Last Updated: October 2026 · Effective Date: October 2026
            </p>
          </div>

          {/* Section: Overview */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">1. Introduction &amp; Scope</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              DueFlow (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the web application accessible at{' '}
              <a href="https://dueflow-kappa.vercel.app" className="text-[#3b82f6] underline">
                https://dueflow-kappa.vercel.app
              </a>{' '}
              and associated reminder dispatch services. DueFlow provides automated invoice reminder and follow-up solutions for freelancers, consultants, and boutique agency businesses.
            </p>
            <p className="text-sm text-[#334155] leading-relaxed">
              This Privacy Policy explains how we collect, store, utilize, and protect your information when you access or use DueFlow. We are committed to transparency, data minimization, and strict adherence to global privacy laws, including the Indian Digital Personal Data Protection (DPDP) Act, GDPR principles, and the Google API Services User Data Policy.
            </p>
          </section>

          {/* Section: Information Collected */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">2. Information We Collect</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              We collect only the minimum personal and business data necessary to provide and operate our automated invoice follow-up workflows:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1.5 pl-2 leading-relaxed">
              <li>
                <strong>Account Credentials:</strong> Email address, user full name, business or freelancer name, and profile settings provided during registration or OAuth sign-in.
              </li>
              <li>
                <strong>Client &amp; Invoice Data:</strong> Client contact details (name, email address, optional phone number) and invoice records (invoice number, issue date, due date, amount in INR, and payment notes).
              </li>
              <li>
                <strong>Payment Coordinates:</strong> Optional settlement coordinates you choose to configure, such as your UPI ID (VPA), bank account number, IFSC code, and payment QR code image, used exclusively to display settlement instructions to your authorized clients.
              </li>
              <li>
                <strong>Integration Tokens:</strong> When you connect your third-party email provider (e.g., Google Gmail or Microsoft Outlook), we store OAuth refresh tokens securely encrypted server-side solely to perform outbound email dispatches requested by you.
              </li>
            </ul>
          </section>

          {/* Section: Google API Services User Data Policy & Limited Use Disclosure */}
          <section className="space-y-4 p-5 sm:p-6 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl">
            <div className="flex items-center gap-2 text-[#0f172a]">
              <Lock size={18} className="text-[#3b82f6]" />
              <h2 className="text-base font-bold">
                3. Google API Services &amp; Limited Use Disclosure
              </h2>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed">
              DueFlow uses Google OAuth2.0 authentication to enable you to connect your Google Gmail account. Specifically, we request the{' '}
              <code className="text-xs bg-white px-2 py-0.5 rounded border border-[#cbd5e1] font-mono text-[#0f172a]">
                https://www.googleapis.com/auth/gmail.send
              </code>{' '}
              permission scope to send invoice reminder emails directly on your behalf to your clients.
            </p>
            <div className="space-y-2 text-sm text-[#334155] leading-relaxed">
              <p className="font-semibold text-[#0f172a]">
                Strict Adherence to Google Limited Use Requirements:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  DueFlow&rsquo;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3b82f6] underline"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </li>
                <li>
                  We do <strong>NOT</strong> read your incoming emails, scan your inbox, or access personal messages.
                </li>
                <li>
                  We do <strong>NOT</strong> sell, transfer, or share Google user data with any third parties or advertising networks.
                </li>
                <li>
                  We do <strong>NOT</strong> use Google user data to train, fine-tune, or develop artificial intelligence (AI) or machine learning (ML) models.
                </li>
                <li>
                  OAuth access and refresh tokens are stored securely encrypted server-side and are never logged or exposed to client-side scripts.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: How We Use Data */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">4. How We Use Your Data</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              Your data is processed strictly for the following operational purposes:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1 pl-2 leading-relaxed">
              <li>To calculate reminder schedules based on your invoice due dates.</li>
              <li>To dispatch reminder messages via your connected email provider or WhatsApp.</li>
              <li>To track delivery statuses (acceptance message IDs, timestamps, errors).</li>
              <li>To prevent duplicate dispatches and enforce rate limits.</li>
              <li>To authenticate your session and maintain tenant-isolated workspace security.</li>
            </ul>
          </section>

          {/* Section: Data Security & Retention */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">5. Security &amp; Data Retention</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              We employ industry-standard administrative, physical, and technical safeguards to protect your personal information against unauthorized access, loss, or misuse:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1 pl-2 leading-relaxed">
              <li>Transport Layer Security (TLS 1.3) encryption across all public endpoints.</li>
              <li>Database Row Level Security (RLS) guaranteeing strict per-user tenant isolation.</li>
              <li>AES-256 encryption at rest for sensitive integration secrets and OAuth refresh tokens.</li>
              <li>Automated token revocation upon user disconnection from the Settings screen.</li>
            </ul>
          </section>

          {/* Section: User Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">6. Your Rights &amp; Control</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              You maintain full ownership of your data at all times. You have the right to:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1 pl-2 leading-relaxed">
              <li>Access, export, update, or edit your saved business profile and invoices at any time.</li>
              <li>Disconnect your connected Google Gmail or Microsoft accounts immediately with a single click in Settings.</li>
              <li>Request complete deletion of your account and all associated historical records by contacting our support team.</li>
            </ul>
          </section>

          {/* Section: Contact */}
          <section className="space-y-2 pt-4 border-t border-[#f1f5f9]">
            <h2 className="text-lg font-bold text-[#0f172a]">7. Contact Us</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              If you have any questions or concerns regarding this Privacy Policy or our data practices, please contact our Privacy Team at:
            </p>
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs space-y-1 font-medium text-[#475569]">
              <div><strong>Application:</strong> DueFlow (https://dueflow-kappa.vercel.app)</div>
              <div><strong>Email:</strong> support@dueflow.in / privacy@dueflow.in</div>
              <div><strong>Location:</strong> India</div>
            </div>
          </section>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="w-full bg-white border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 DueFlow. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-[#0f172a] font-semibold underline">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#0f172a] transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
