import React from 'react';
import { ArrowLeft, FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
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
              Terms of Service
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4 border border-blue-200">
              <FileText size={13} />
              <span>User Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
              Terms of Service
            </h1>
            <p className="text-sm text-[#64748b] mt-2">
              Last Updated: October 2026 · Effective Date: October 2026
            </p>
          </div>

          {/* Section 1: Agreement to Terms */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">1. Agreement to Terms</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and DueFlow (&ldquo;DueFlow,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of the DueFlow website at{' '}
              <a href="https://dueflow-kappa.vercel.app" className="text-[#3b82f6] underline">
                https://dueflow-kappa.vercel.app
              </a>{' '}
              and all related services.
            </p>
            <p className="text-sm text-[#334155] leading-relaxed">
              By registering an account, logging in, or otherwise accessing DueFlow, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must immediately discontinue use of DueFlow.
            </p>
          </section>

          {/* Section 2: Service Description */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">2. Description of the Service</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              DueFlow is a workflow productivity SaaS application built to assist freelancers, independent contractors, and boutique studios in managing invoices and scheduling automated payment follow-ups. Key features include:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1.5 pl-2 leading-relaxed">
              <li>Invoice ledger creation, tracking, and status derivation (Due Soon, Overdue, Paid).</li>
              <li>Automated multi-stage reminder schedules (-3 days, due date, +3 days overdue, +7 days overdue).</li>
              <li>Outbound email reminder dispatch via user-connected email providers (such as Google Gmail or Microsoft Outlook).</li>
              <li>Custom payment instructions presentation, including direct UPI ID and payment QR code embeds.</li>
            </ul>
          </section>

          {/* Section 3: User Responsibilities & Acceptable Use */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">3. User Responsibilities &amp; Acceptable Use</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              When utilizing DueFlow, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1.5 pl-2 leading-relaxed">
              <li>You have a legitimate business or contractual relationship with the clients you add to DueFlow.</li>
              <li>You possess necessary authorization and consent to contact your designated client recipients via email and/or WhatsApp.</li>
              <li>You will not use DueFlow to transmit spam, unsolicited commercial advertisements, phishing content, harassment, or unlawful communications.</li>
              <li>All billing amounts, invoice dates, and payment settlement coordinates you configure are truthful and accurate.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            </ul>
          </section>

          {/* Section 4: Third-Party Integrations & OAuth */}
          <section className="space-y-3 p-5 sm:p-6 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl">
            <div className="flex items-center gap-2 text-[#0f172a]">
              <ShieldCheck size={18} className="text-[#3b82f6]" />
              <h2 className="text-base font-bold">4. Third-Party Integrations &amp; Google API Usage</h2>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed">
              DueFlow allows you to connect external service providers, including Google Gmail, Microsoft Outlook, and WhatsApp Business. When connecting your Google account:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1.5 pl-2 leading-relaxed">
              <li>
                You explicitly grant DueFlow permission to send outgoing emails on your behalf strictly in accordance with your invoice reminder settings.
              </li>
              <li>
                DueFlow strictly complies with the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3b82f6] underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use restrictions.
              </li>
              <li>
                You may revoke DueFlow&rsquo;s access to your Google account at any time through DueFlow Settings or via your Google Account Security Permissions page.
              </li>
            </ul>
          </section>

          {/* Section 5: Payment Disclaimer */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">5. Payment Processing Disclaimer</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              DueFlow is a communication and productivity tool, not a financial institution, payment gateway, escrow agent, or money transmitter.
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-700" />
                <span>Important Settlement Notice:</span>
              </div>
              <p>
                DueFlow displays your configured settlement details (e.g., UPI ID, bank account numbers, IFSC codes, QR images) to your clients. All monetary payments occur directly between your clients and your own banking channels. DueFlow does not touch, hold, collect, or guarantee any funds transferred between parties.
              </p>
            </div>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">6. Limitation of Liability</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              To the maximum extent permitted by applicable law, DueFlow and its developers, affiliates, and licensors shall not be liable for any indirect, incidental, punitive, or consequential damages arising from:
            </p>
            <ul className="list-disc list-inside text-sm text-[#334155] space-y-1 pl-2 leading-relaxed">
              <li>Your use of or inability to access the service.</li>
              <li>Third-party email or provider rejections, spam-folder routing, or rate limits.</li>
              <li>Delays in payment by your clients or disputes concerning client invoices.</li>
              <li>Unauthorized access to or alteration of your transmissions or data.</li>
            </ul>
          </section>

          {/* Section 7: Termination & Account Cancellation */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">7. Termination</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              You may terminate your account at any time by disconnecting your integrations and contacting support. We reserve the right to suspend or terminate accounts that violate these Terms, engage in spamming or abusive behavior, or disrupt system stability.
            </p>
          </section>

          {/* Section 8: Governing Law & Jurisdiction */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0f172a]">8. Governing Law</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any dispute arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section className="space-y-2 pt-4 border-t border-[#f1f5f9]">
            <h2 className="text-lg font-bold text-[#0f172a]">9. Questions &amp; Inquiries</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              For questions concerning these Terms of Service, please reach out to:
            </p>
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs space-y-1 font-medium text-[#475569]">
              <div><strong>Application:</strong> DueFlow (https://dueflow-kappa.vercel.app)</div>
              <div><strong>Legal Inquiries:</strong> legal@dueflow.in / support@dueflow.in</div>
              <div><strong>Jurisdiction:</strong> India</div>
            </div>
          </section>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="w-full bg-white border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 DueFlow. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-[#0f172a] transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="text-[#0f172a] font-semibold underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
