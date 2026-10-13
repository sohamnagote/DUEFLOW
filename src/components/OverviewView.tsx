import React from 'react';
import { Invoice, Client } from '../types';
import { formatCurrency, summarizeInvoicesByCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/date';

interface OverviewViewProps {
  invoices?: Invoice[];
  clients?: Client[];
  userPreferredCurrency?: string;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onNewInvoiceClick: () => void;
  onAddClientClick: () => void;
  onClearData?: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToReminders?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  invoices = [],
  clients = [],
  userPreferredCurrency = 'INR',
  isLoading = false,
  loadError = null,
  onRetry,
  onNewInvoiceClick,
  onAddClientClick,
  onClearData,
  onNavigateToInvoices,
  onNavigateToClients,
  onNavigateToReminders,
}) => {
  const safeInvoices: Invoice[] = Array.isArray(invoices)
    ? (invoices.filter(Boolean) as Invoice[])
    : Array.isArray((invoices as any)?.invoices)
    ? (((invoices as any).invoices.filter(Boolean)) as Invoice[])
    : [];

  const safeClients: Client[] = Array.isArray(clients)
    ? (clients.filter(Boolean) as Client[])
    : Array.isArray((clients as any)?.clients)
    ? (((clients as any).clients.filter(Boolean)) as Client[])
    : [];

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#fbf9f4] text-[#1b1c19] px-4 sm:px-8 lg:px-14 py-8 space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#001126]/10">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-[#e5e3de] rounded-lg" />
            <div className="h-4 w-96 bg-[#eceae5] rounded-md" />
          </div>
          <div className="h-10 w-32 bg-[#e5e3de] rounded-lg" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-[#ffffff]/80 border border-[#001126]/10 space-y-3">
              <div className="h-3 w-24 bg-[#eceae5] rounded" />
              <div className="h-8 w-32 bg-[#e5e3de] rounded-lg" />
              <div className="h-3 w-28 bg-[#eceae5] rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#ffffff]/80 rounded-2xl border border-[#001126]/10 p-6 space-y-4">
            <div className="h-5 w-36 bg-[#e5e3de] rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[#f5f3ee] rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 bg-[#ffffff]/80 rounded-2xl border border-[#001126]/10 p-6 space-y-4">
            <div className="h-5 w-44 bg-[#e5e3de] rounded" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-[#f5f3ee] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Actionable Error State
  if (loadError) {
    return (
      <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#fbf9f4] text-[#1b1c19] px-4 sm:px-8 lg:px-14 py-12 items-center justify-center text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#ba1a1a]/20 shadow-sm space-y-4">
          <span className="material-symbols-outlined text-4xl text-[#ba1a1a]">warning</span>
          <h2 className="text-xl font-bold text-[#001126]">Unable to load workspace</h2>
          <p className="text-sm text-[#44474d]">{loadError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-action-primary w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            >
              Retry loading
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasData = safeInvoices.length > 0 || safeClients.length > 0;

  // Currency-separated summaries (Never mix distinct currencies into a false single aggregate)
  const currencySummaries = summarizeInvoicesByCurrency(safeInvoices);
  const overdueCount = safeInvoices.filter((inv) => {
    if (!inv || inv.status === 'paid') return false;
    if (inv.status === 'overdue') return true;
    if (inv.dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      return inv.dueDate < todayStr;
    }
    return false;
  }).length;

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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            {onClearData && (
              <button
                onClick={onClearData}
                className="btn-action-secondary w-full sm:w-auto text-xs text-[#74777d] hover:text-[#ba1a1a] px-3.5 py-2.5 rounded-lg justify-center cursor-pointer"
                title="Reset back to pristine empty state"
              >
                Reset to empty state
              </button>
            )}
            <button
              onClick={onNewInvoiceClick}
              className="btn-action-primary w-full sm:w-auto text-sm font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New invoice</span>
            </button>
          </div>
        </div>

        {/* Responsive Metrics Bar */}
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
              Across {safeInvoices.filter((i) => i && i.status !== 'paid').length} unpaid invoices
            </span>
          </div>

          {/* Metric 2: Overdue Follow-ups */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Overdue Invoices
            </span>
            <div className="my-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${overdueCount > 0 ? 'text-[#ba1a1a]' : 'text-[#001126]'}`}>
                {overdueCount}
              </span>
            </div>
            <span className="text-[11px] text-[#74777d]">
              {overdueCount > 0 ? 'Eligible for payment follow-up' : 'All invoices are on schedule'}
            </span>
          </div>

          {/* Metric 3: Clients Managed */}
          <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#001126]/10 flex flex-col justify-between shadow-2xs">
            <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-[#74777d]">
              Clients Managed
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#001126]">
                {safeClients.length}
              </span>
            </div>
            <span className="text-[11px] text-[#74777d]">
              {safeClients.length === 1 ? '1 client in your directory' : `${safeClients.length} clients in directory`}
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
              Cleared paid revenue
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
                  Recent Invoices
                </h2>
              </div>
              {onNavigateToInvoices && safeInvoices.length > 0 && (
                <button
                  onClick={onNavigateToInvoices}
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#3d6562] hover:underline cursor-pointer"
                >
                  View all ({safeInvoices.length}) →
                </button>
              )}
            </div>

            {safeInvoices.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-[#74777d]">No invoices created yet.</p>
                <button
                  onClick={onNewInvoiceClick}
                  className="btn-action-primary text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Create your first invoice
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#001126]/8">
                {safeInvoices.slice(0, 5).map((inv) => (
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
                        Due: {formatDisplayDate(inv.dueDate)} {inv.description ? `• ${inv.description}` : ''}
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
            )}
          </div>

          {/* Right Column: Autopilot Reminders (5 cols) */}
          <div className="lg:col-span-5 bg-[#ffffff]/85 backdrop-blur-xs rounded-2xl border border-[#001126]/10 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-[#3d6562]">
                  schedule
                </span>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#001126]">
                  Reminders Queue
                </h2>
              </div>
              {onNavigateToReminders && (
                <button
                  onClick={onNavigateToReminders}
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#3d6562] hover:underline cursor-pointer"
                >
                  Manage rules →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {(() => {
                const pendingReminders = safeInvoices.filter(
                  (inv) => inv && (inv.status === 'pending' || inv.status === 'overdue' || (inv.status as string) === 'unpaid')
                );
                if (pendingReminders.length === 0) {
                  return (
                    <div className="p-6 bg-[#f5f3ee] rounded-xl text-center space-y-1">
                      <p className="text-xs font-semibold text-[#001126]">No reminders currently due</p>
                      <p className="text-[11px] text-[#74777d]">
                        Reminders are automatically scheduled when unpaid invoices are created.
                      </p>
                    </div>
                  );
                }
                return pendingReminders.slice(0, 4).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={onNavigateToReminders}
                    className="p-3 bg-[#f5f3ee] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#edebe5] transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-semibold text-[#001126] truncate">
                        {inv.clientName || 'Client'} • {inv.invoiceNumber}
                      </h4>
                      <p className="font-['Space_Mono'] text-[10px] text-[#74777d]">
                        {inv.status === 'overdue'
                          ? `Overdue • Due ${formatDisplayDate(inv.dueDate)}`
                          : `Due ${formatDisplayDate(inv.dueDate)}`}
                      </p>
                    </div>
                    <span
                      className={`font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded shrink-0 font-semibold ${
                        inv.status === 'overdue'
                          ? 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                          : 'bg-[#001126]/8 text-[#001126]'
                      }`}
                    >
                      {inv.status === 'overdue' ? 'Overdue' : 'Queued'}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exact Clean Empty State (When neither invoices nor clients exist)
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-[#fbf9f4] text-[#1b1c19] px-6 sm:px-14 py-12 justify-between">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
            Your workspace.
          </h1>
          <p className="text-xs sm:text-sm text-[#44474d] max-w-xl">
            Track invoices, automate intelligent payment reminders, and keep creative studio cashflow seamless.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewInvoiceClick}
            className="btn-action-primary text-sm font-semibold px-7 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New invoice</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Content (Clean Empty State) */}
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto my-auto">
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
          <div className="absolute -bottom-2 -right-2 grid grid-cols-3 gap-1 opacity-30">
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
            <div className="w-1 h-1 rounded-full bg-[#001126]" />
          </div>
        </div>

        <h2 className="text-[22px] leading-[28px] font-semibold text-[#001126] mb-2 tracking-tight">
          Nothing here yet.
        </h2>
        <p className="text-base leading-[26px] text-[#44474d] max-w-md mb-8">
          Your invoices, clients, and payment follow-ups will appear here once you get started.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={onNewInvoiceClick}
            className="btn-action-primary w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-lg shadow-sm cursor-pointer"
          >
            Create your first invoice
          </button>
          <button
            onClick={onAddClientClick}
            className="text-sm text-[#3d6562] hover:text-[#244d4a] transition-all underline underline-offset-4 decoration-1 py-2 px-4 hover:opacity-90 active:scale-[0.98] inline-block cursor-pointer"
          >
            Add a client first
          </button>
        </div>
      </div>

      <div />
    </div>
  );
};
