import React, { useState } from 'react';
import { formatCurrency } from '../utils/currency';

interface RemindersViewProps {
  onRefineWithGemini?: (text: string) => Promise<string>;
  userPreferredCurrency?: 'INR' | 'USD';
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  userPreferredCurrency = 'INR',
}) => {
  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
  const [subjectLine, setSubjectLine] = useState('Invoice {{invoice_number}} payment reminder');
  const [message, setMessage] = useState(
    `Hi {{client_name}},\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code.`
  );
  const [automatedEnabled, setAutomatedEnabled] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scheduleList, setScheduleList] = useState<string[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToneSelect = (selected: 'friendly' | 'professional' | 'firm') => {
    setTone(selected);
    if (selected === 'friendly') {
      setSubjectLine('Friendly note: Invoice {{invoice_number}} payment reminder');
      setMessage(
        `Hi {{client_name}},\n\nHope you're having a great week!\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code. Let me know if you need anything!`
      );
    } else if (selected === 'firm') {
      setSubjectLine('Payment overdue notice: Invoice {{invoice_number}}');
      setMessage(
        `Dear {{client_name}},\n\nAccording to our records, payment for invoice {{invoice_number}} totaling {{total_amount}} was due on {{due_date}} and remains outstanding.\n\nPlease settle the balance using the attached payment details or QR code today.`
      );
    } else {
      setSubjectLine('Invoice {{invoice_number}} payment reminder');
      setMessage(
        `Hi {{client_name}},\n\nThis is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nYou can review payment details attached or scan the payment QR code.`
      );
    }
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] px-6 sm:px-14 py-8 space-y-12 max-w-5xl">
      {/* Editorial Header Section */}
      <section className="space-y-1">
        <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
          Reminders
        </h1>
        <p className="text-sm text-[#44474d]">
          Choose when DueFlow should email clients about unpaid invoices.
        </p>
      </section>

      {/* Section 1: Reminder Schedule (Exact Image 8) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Reminder schedule
          </h2>
          <p className="text-xs text-[#44474d]">
            Set the timing that works for you.
          </p>
        </div>

        {scheduleList.length === 0 ? (
          <div className="bg-[#f0eee9]/40 rounded-xl border border-[#001126]/5 p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#eae8e3] flex items-center justify-center text-[#44474d]">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#001126] mb-1">
                No reminders scheduled
              </h3>
              <p className="text-xs text-[#44474d]">
                Choose when your clients should receive payment reminders.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-[#15263c] text-[#fbf9f4] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:bg-[#001126] transition-all"
            >
              + ADD REMINDER
            </button>
          </div>
        ) : (
          <div className="bg-[#f0eee9]/40 rounded-xl border border-[#001126]/5 p-6 space-y-3">
            {scheduleList.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#ffffff] rounded-lg">
                <span className="text-sm font-medium text-[#001126]">{item}</span>
                <button
                  onClick={() => setScheduleList((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-[#ba1a1a] hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-semibold text-[#001126] hover:underline pt-2 block"
            >
              + Add another reminder timing
            </button>
          </div>
        )}
      </section>

      {/* Section 2: Active Automation & Reminders (Exact Image 8) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Active automation & reminders
          </h2>
          <p className="text-xs text-[#44474d]">
            Manage global execution and view active trigger counts.
          </p>
        </div>

        <div className="bg-[#f0eee9]/40 rounded-xl border border-[#001126]/5 p-6 space-y-6">
          {/* Global Toggle Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#001126]/5">
            <div>
              <h3 className="text-sm font-semibold text-[#001126]">
                Enable automated reminder emails globally
              </h3>
              <p className="text-xs text-[#44474d] mt-0.5">
                2 active triggers across 4 invoices
              </p>
            </div>
            <button
              onClick={() => setAutomatedEnabled(!automatedEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                automatedEnabled ? 'bg-[#15263c]' : 'bg-[#c4c6cd]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#ffffff] transition-transform ${
                  automatedEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger Queue List (Exact Image 8) */}
          <div className="space-y-3">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#44474d] block">
              UPCOMING TRIGGER QUEUE
            </span>

            <div className="space-y-2">
              {/* Item 1 */}
              <div className="p-3.5 bg-[#ffffff] rounded-lg border border-[#001126]/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">
                    Acme Corp • INV-2024-001
                  </h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#44474d] mt-0.5">
                    Due in 2 days • Scheduled for tomorrow, 9:00 AM
                  </p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-2.5 py-0.5 rounded-full bg-[#001126]/8 text-[#001126]">
                  Queued
                </span>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 bg-[#ffffff] rounded-lg border border-[#001126]/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">
                    Stellar Labs • INV-2024-003
                  </h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#44474d] mt-0.5">
                    Due today • Scheduled for today, 2:00 PM
                  </p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-2.5 py-0.5 rounded-full bg-[#001126]/8 text-[#001126]">
                  Queued
                </span>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 bg-[#ffffff] rounded-lg border border-[#001126]/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">
                    Nexus Studio • INV-2024-000
                  </h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#44474d] mt-0.5">
                    Overdue by 3 days • Sent yesterday
                  </p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-3 py-0.5 rounded-full bg-[#001126] text-[#ffffff]">
                  Sent
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Email Template (Exact Image 8) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#001126]">
            Email template
          </h2>
          <p className="text-xs text-[#44474d]">
            Customize the message sent with your invoice.
          </p>
        </div>

        <div className="bg-[#f0eee9]/40 rounded-xl border border-[#001126]/5 p-6 sm:p-8 space-y-6">
          {/* Tone Selector */}
          <div className="flex items-center justify-between">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]">
              TONE
            </span>
            <div className="inline-flex rounded border border-[#001126]/10 bg-[#ffffff] p-0.5">
              {(['friendly', 'professional', 'firm'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleToneSelect(t)}
                  className={`px-4 py-1 text-xs capitalize transition-all ${
                    tone === t
                      ? 'bg-[#ffffff] font-semibold text-[#001126] shadow-2xs'
                      : 'text-[#44474d] hover:text-[#001126]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] block">
              SUBJECT LINE
            </span>
            <input
              type="text"
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#fbf9f4] text-xs rounded border border-[#001126]/10 focus:outline-none focus:border-[#001126]"
            />
          </div>

          {/* Email Message */}
          <div className="space-y-1.5">
            <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] block">
              EMAIL MESSAGE
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full p-4 bg-[#fbf9f4] text-xs rounded border border-[#001126]/10 focus:outline-none focus:border-[#001126] leading-relaxed resize-y"
            />
          </div>

          {/* Bottom Bar: Preview Email & Save Template */}
          <div className="pt-4 flex items-center justify-between border-t border-[#001126]/5">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] hover:text-[#001126] tracking-wider"
            >
              PREVIEW EMAIL
            </button>
            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="text-xs text-[#3d6562] font-semibold">Saved!</span>
              )}
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#15263c] text-[#fbf9f4] text-[11px] font-semibold uppercase tracking-[0.14em] rounded-[6px] hover:bg-[#001126] transition-all"
              >
                SAVE TEMPLATE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#001126]">Add Reminder Trigger</h3>
            <p className="text-xs text-[#44474d]">
              Choose the timing relative to the invoice due date:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setScheduleList((prev) => [...prev, '3 days before due date (Friendly tone)']);
                  setShowAddModal(false);
                }}
                className="w-full text-left p-2.5 rounded bg-[#f5f3ee] hover:bg-[#eae8e3] text-xs font-medium"
              >
                3 days before due date
              </button>
              <button
                onClick={() => {
                  setScheduleList((prev) => [...prev, 'On due date (Professional tone)']);
                  setShowAddModal(false);
                }}
                className="w-full text-left p-2.5 rounded bg-[#f5f3ee] hover:bg-[#eae8e3] text-xs font-medium"
              >
                On the due date
              </button>
              <button
                onClick={() => {
                  setScheduleList((prev) => [...prev, '5 days after due date (Firm overdue tone)']);
                  setShowAddModal(false);
                }}
                className="w-full text-left p-2.5 rounded bg-[#f5f3ee] hover:bg-[#eae8e3] text-xs font-medium"
              >
                5 days overdue
              </button>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[#74777d] hover:text-[#001126]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Email Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#001126]/10">
              <h3 className="text-sm font-bold text-[#001126]">Email Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-[#74777d]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-2 rounded bg-[#f5f3ee] text-[#001126]">
                <span className="text-[#44474d] font-semibold">Subject: </span>
                {subjectLine.replace('{{invoice_number}}', 'INV-2024-001')}
              </div>
              <div className="p-4 rounded bg-[#fbf9f4] whitespace-pre-wrap leading-relaxed text-[#1b1c19]">
                {message
                  .replace('{{client_name}}', 'Acme Corp')
                  .replace('{{invoice_number}}', 'INV-2024-001')
                  .replace(
                    '{{total_amount}}',
                    formatCurrency(userPreferredCurrency === 'INR' ? 180000 : 2400, userPreferredCurrency, {
                      includeDecimals: true,
                    })
                  )
                  .replace('{{due_date}}', 'October 11, 2026')}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-[#15263c] text-white text-xs rounded"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
