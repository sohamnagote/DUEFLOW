import React from 'react';
import { Invoice, Client } from '../types';
import { formatCurrency, summarizeInvoicesByCurrency } from '../utils/currency';

interface OverviewViewProps {
  invoices?: Invoice[];
  clients?: Client[];
  userPreferredCurrency?: string;
  onNewInvoiceClick: () => void;
  onAddClientClick: () => void;
  onLoadSampleData?: () => void;
  onClearData?: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToReminders?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  invoices = [],
  clients = [],
  userPreferredCurrency = 'INR',
  onNewInvoiceClick,
  onAddClientClick,
  onLoadSampleData,
  onClearData,
  onNavigateToInvoices,
  onNavigateToClients,
  onNavigateToReminders,
}) => {
  const hasData = invoices.length > 0 || clients.length > 0;

  // Currency-separated summaries (Never mix distinct currencies into a false single aggregate)
  const currencySummaries = summarizeInvoicesByCurrency(invoices);
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

  if (hasData) {
    return (
      <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#fbf9f4] text-[#1b1c19] px-4 sm:px-8 lg:px-14 py-8 space-y-8">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#001126]/10">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
              Your workspace.
            </h1>
            <p className="text-xs sm:text-sm text-[#44474d] max-w-xl">
              Track invoices, automate intelligent payment reminders, and keep creative studio cashflow seamless.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onClearData && (
              <button
                onClick={onClearData}
                className="text-xs text-[#74777d] hover:text-[#ba1a1a] px-3 py-2 border border-[#001126]/10 rounded-lg hover:bg-[#f5f3ee] transition-all"
                title="Reset back to pristine empty state"
              >
                Reset to empty state
              </button>
            )}
            <button
              onClick={onNewInvoiceClick}
              className="bg-[#001126] text-[#ffffff] text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#15263c] transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New invoice</span>
            </button>
          </div>
        </div>

        {/* Responsive Metrics Bar (Auto Layout Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Metric 1: Total Outstanding */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Total Outstanding
            </span>
            <div className="my-2 space-y-1">
              {currencySummaries.length === 0 ? (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#001126]">
                  {formatCurrency(0, userPreferredCurrency)}
                </span>
              ) : currencySummaries.length === 1 ? (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#001126]">
                  {currencySummaries[0].formattedOutstanding}
                </span>
              ) : (
                <div className="flex flex-col gap-1">
                  {currencySummaries.map((s) => (
                    <span key={s.currency} className="text-xl sm:text-2xl font-extrabold text-[#001126]">
                      {s.formattedOutstanding}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[11px] text-[#74777d]">
              Across {invoices.filter((i) => i.status !== 'paid').length} active invoices
            </span>
          </div>

          {/* Metric 2: Overdue Follow-ups */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Overdue Follow-ups
            </span>
            <div className="my-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${overdueCount > 0 ? 'text-[#ba1a1a]' : 'text-[#001126]'}`}>
                {overdueCount}
              </span>
            </div>
            <span className="text-[11px] text-[#74777d]">
              Auto-queued in reminder flow
            </span>
          </div>

          {/* Metric 3: Clients Managed */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Clients Managed
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#001126]">
                {clients.length}
              </span>
            </div>
            <span className="text-[11px] text-[#74777d]">
              With customized payment schedules
            </span>
          </div>

          {/* Metric 4: Total Collected */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Total Collected
            </span>
            <div className="my-2 space-y-1">
              {currencySummaries.length === 0 ? (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#3d6562]">
                  {formatCurrency(0, userPreferredCurrency)}
                </span>
              ) : currencySummaries.length === 1 ? (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#3d6562]">
                  {currencySummaries[0].formattedCollected}
                </span>
              ) : (
                <div className="flex flex-col gap-1">
                  {currencySummaries.map((s) => (
                    <span key={s.currency} className="text-xl sm:text-2xl font-extrabold text-[#3d6562]">
                      {s.formattedCollected}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[11px] text-[#3d6562]">
              Cleared into bank account
            </span>
          </div>
        </div>

        {/* Content: Invoices Table & Upcoming Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Recent Invoices (7 cols) */}
          <div className="lg:col-span-7 bg-[#ffffff]/85 backdrop-blur-xs rounded-2xl border border-[#001126]/10 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-[#3d6562]">
                  receipt_long
                </span>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#001126]">
                  Active Invoices
                </h2>
              </div>
              {onNavigateToInvoices && (
                <button
                  onClick={onNavigateToInvoices}
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#3d6562] hover:underline"
                >
                  View all ({invoices.length}) →
                </button>
              )}
            </div>

            <div className="divide-y divide-[#001126]/8">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={onNavigateToInvoices}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#fbf9f4] px-2.5 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-[#001126] truncate">
                        {inv.clientName}
                      </span>
                      <span className="font-['Space_Mono'] text-[10px] text-[#74777d]">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    <p className="text-xs text-[#44474d] truncate">
                      {inv.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="font-['Space_Mono'] text-xs font-bold text-[#001126]">
                      {formatCurrency(inv.amount, inv.currency)}
                    </span>
                    <span
                      className={`font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-[#3d6562]/10 text-[#3d6562]'
                          : inv.status === 'overdue'
                          ? 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                          : 'bg-[#001126]/10 text-[#001126]'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Automation & Reminder Queue (5 cols) */}
          <div className="lg:col-span-5 bg-[#ffffff]/85 backdrop-blur-xs rounded-2xl border border-[#001126]/10 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-[#3d6562]">
                  schedule
                </span>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#001126]">
                  Autopilot Reminders
                </h2>
              </div>
              {onNavigateToReminders && (
                <button
                  onClick={onNavigateToReminders}
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#3d6562] hover:underline"
                >
                  Configure rules →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#f5f3ee] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">Acme Corp • INV-2024-001</h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#74777d]">Due in 2 days • Scheduled tomorrow 9:00 AM</p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded bg-[#001126]/8 text-[#001126]">Queued</span>
              </div>
              <div className="p-3 bg-[#f5f3ee] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">Stellar Labs • INV-2024-003</h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#74777d]">Due today • Scheduled today 2:00 PM</p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded bg-[#001126]/8 text-[#001126]">Queued</span>
              </div>
              <div className="p-3 bg-[#f5f3ee] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#001126]">Nexus Studio • INV-2024-000</h4>
                  <p className="font-['Space_Mono'] text-[10px] text-[#74777d]">Overdue by 3 days • Sent yesterday</p>
                </div>
                <span className="font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded bg-[#001126] text-white">Sent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exact Image 16 Empty State
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#fbf9f4] text-[#1b1c19] px-6 sm:px-14 py-12 justify-between">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
            Your workspace.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {onLoadSampleData && (
            <button
              onClick={onLoadSampleData}
              className="text-xs font-medium text-[#44474d] hover:text-[#001126] px-4 py-2 rounded-lg border border-[#001126]/10 hover:bg-[#f5f3ee] transition-all"
            >
              Load sample data
            </button>
          )}
          <button
            onClick={onNewInvoiceClick}
            className="bg-[#001126] text-[#ffffff] text-sm font-semibold px-7 py-2.5 rounded-lg hover:bg-[#15263c] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New invoice</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Content (Empty State - Exact Image 16) */}
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto my-auto">
        {/* Restrained Vector Outline Illustration */}
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#3d6562]/5 rounded-full blur-2xl" />
          <svg
            className="w-24 h-24 text-[#001126] relative z-10"
            fill="none"
            viewBox="0 0 96 96"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              className="opacity-40"
              height="64"
              rx="2"
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              width="56"
              x="20"
              y="16"
            />
            <rect
              className="text-[#001126]"
              height="40"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
              width="40"
              x="28"
              y="28"
            />
            <path
              className="text-[#3d6562]"
              d="M38 42H58"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
            <path
              className="text-[#3d6562]"
              d="M38 52H50"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
            <circle cx="60" cy="20" fill="#3d6562" r="3" />
          </svg>
          {/* Dot Matrix Accent */}
          <div className="absolute -bottom-2 -right-2 grid grid-cols-3 gap-1 opacity-30">
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
          </div>
        </div>

        {/* Editorial Typography */}
        <h2 className="text-[22px] leading-[28px] font-semibold text-[#001126] mb-2 tracking-tight">
          Nothing here yet.
        </h2>
        <p className="text-base leading-[26px] text-[#44474d] max-w-md mb-8">
          Your invoices, clients, and payment follow-ups will appear here once you get started.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={onNewInvoiceClick}
            className="w-full sm:w-auto bg-[#001126] text-[#ffffff] text-sm font-semibold px-8 py-3 rounded-lg hover:bg-[#15263c] transition-all shadow-sm"
          >
            Create your first invoice
          </button>
          <button
            onClick={onAddClientClick}
            className="text-sm text-[#3d6562] hover:text-[#244d4a] transition-all underline underline-offset-4 decoration-1 py-2 px-4"
          >
            Add a client first
          </button>
        </div>
      </div>

      <div />
    </div>
  );
};
