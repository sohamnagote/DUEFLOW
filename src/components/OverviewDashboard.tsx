import React from 'react';
import { Invoice, Client, ReminderQueueItem } from '../types';

interface OverviewDashboardProps {
  invoices: Invoice[];
  clients: Client[];
  reminderQueue: ReminderQueueItem[];
  onNewInvoice: () => void;
  onNewClient: () => void;
  onNavigateToInvoices: () => void;
  onNavigateToReminders: () => void;
  onNavigateToCampaigns: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  invoices,
  clients,
  reminderQueue,
  onNewInvoice,
  onNewClient,
  onNavigateToInvoices,
  onNavigateToReminders,
  onNavigateToCampaigns,
}) => {
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalCollected = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

  const hasData = invoices.length > 0 || clients.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Editorial Header Section (Auto Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#15263c]/10">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono-technical text-[10px] uppercase tracking-[0.2em] text-[#3d6562]">
              AUTONOMOUS LEDGER
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#9ec9c4] animate-pulse" />
            <span className="font-mono-technical text-[10px] text-[#74777d]">
              GMAIL AUTOPILOT ACTIVE
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#15263c] tracking-tight">
            Your workspace.
          </h1>
          <p className="font-editorial text-xs sm:text-sm text-[#44474d] max-w-xl">
            Track invoices, automate intelligent payment reminders, and keep creative studio cashflow seamless.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onNewInvoice}
            className="inline-flex items-center gap-2 bg-[#15263c] text-[#fbf9f4] px-4 py-2.5 rounded-xl text-xs font-editorial font-semibold hover:bg-[#001126] transition-all active:scale-[0.98] shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New invoice</span>
          </button>
        </div>
      </div>

      {/* Responsive Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#15263c]/10 flex flex-col justify-between shadow-2xs">
          <span className="font-mono-technical text-[10px] uppercase tracking-wider text-[#74777d]">
            Total Outstanding
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#15263c]">
              ${totalOutstanding.toLocaleString()}
            </span>
          </div>
          <span className="font-editorial text-[11px] text-[#74777d]">
            Across {invoices.filter((i) => i.status !== 'paid').length} active invoices
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#15263c]/10 flex flex-col justify-between shadow-2xs">
          <span className="font-mono-technical text-[10px] uppercase tracking-wider text-[#74777d]">
            Overdue Follow-ups
          </span>
          <div className="my-2">
            <span className={`font-editorial text-2xl sm:text-3xl font-extrabold ${overdueCount > 0 ? 'text-[#ba1a1a]' : 'text-[#15263c]'}`}>
              {overdueCount}
            </span>
          </div>
          <span className="font-editorial text-[11px] text-[#74777d]">
            Auto-queued in Gmail reminder flow
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#15263c]/10 flex flex-col justify-between shadow-2xs">
          <span className="font-mono-technical text-[10px] uppercase tracking-wider text-[#74777d]">
            Clients Managed
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#15263c]">
              {clients.length}
            </span>
          </div>
          <span className="font-editorial text-[11px] text-[#74777d]">
            With customized payment schedules
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xs border border-[#15263c]/10 flex flex-col justify-between shadow-2xs">
          <span className="font-mono-technical text-[10px] uppercase tracking-wider text-[#74777d]">
            Automation Triggers
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#3d6562]">
              {reminderQueue.length}
            </span>
          </div>
          <span className="font-editorial text-[11px] text-[#3d6562]">
            Active sequence triggers
          </span>
        </div>
      </div>

      {/* Main Content Area: Populated or Pristine Empty State */}
      {!hasData ? (
        /* Empty State (Matching Image 16 exactly) */
        <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto">
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#3d6562]/5 rounded-full blur-2xl" />
            <svg
              className="w-20 h-20 text-[#15263c] relative z-10"
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
                className="text-[#15263c]"
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
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
            </div>
          </div>

          <h2 className="font-editorial text-2xl font-bold text-[#15263c] mb-2">
            Nothing here yet.
          </h2>
          <p className="font-editorial text-sm text-[#44474d] max-w-md mb-8 leading-relaxed">
            Your invoices, clients, and payment follow-ups will appear here once you get started.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
              onClick={onNewInvoice}
              className="w-full sm:w-auto bg-[#15263c] text-[#fbf9f4] font-editorial text-xs font-semibold uppercase tracking-[0.14em] px-6 py-3.5 rounded-xl hover:bg-[#001126] transition-all shadow-sm"
            >
              Create your first invoice
            </button>
            <button
              onClick={onNewClient}
              className="font-editorial text-xs text-[#3d6562] hover:text-[#244d4a] transition-all underline underline-offset-4 decoration-1 py-2 px-3"
            >
              Add a client first
            </button>
          </div>
        </div>
      ) : (
        /* Populated Dashboard Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Recent Invoices List (7 cols) */}
          <div className="lg:col-span-7 bg-[#ffffff]/85 backdrop-blur-xs rounded-2xl border border-[#15263c]/10 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#15263c]/8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-[#3d6562]">
                  receipt_long
                </span>
                <h2 className="font-editorial text-sm font-bold uppercase tracking-[0.14em] text-[#15263c]">
                  Active Invoices
                </h2>
              </div>
              <button
                onClick={onNavigateToInvoices}
                className="font-mono-technical text-[10px] uppercase text-[#3d6562] hover:underline"
              >
                View all ({invoices.length}) →
              </button>
            </div>

            <div className="divide-y divide-[#15263c]/8">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={onNavigateToInvoices}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#fbf9f4] px-2.5 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-editorial text-sm font-bold text-[#15263c] truncate">
                        {inv.clientName}
                      </span>
                      <span className="font-mono-technical text-[10px] text-[#74777d]">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    <p className="font-editorial text-xs text-[#44474d] truncate">
                      {inv.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-editorial text-sm font-bold text-[#15263c]">
                        ${inv.amount.toLocaleString()}
                      </div>
                      <div className="font-mono-technical text-[10px] text-[#74777d]">
                        Due {inv.dueDate}
                      </div>
                    </div>

                    <span
                      className={`font-mono-technical text-[9px] uppercase px-2.5 py-1 rounded-full font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-[#bfebe6] text-[#00201e]'
                          : inv.status === 'overdue'
                          ? 'bg-[#ffdad6] text-[#ba1a1a]'
                          : 'bg-[#15263c]/8 text-[#15263c]'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Automated Reminders Queue & Quick Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Automation Queue */}
            <div className="bg-[#ffffff]/85 backdrop-blur-xs rounded-2xl border border-[#15263c]/10 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#15263c]/8">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px] text-[#3d6562]">
                    notifications_active
                  </span>
                  <h2 className="font-editorial text-sm font-bold uppercase tracking-[0.14em] text-[#15263c]">
                    Upcoming Trigger Queue
                  </h2>
                </div>
                <button
                  onClick={onNavigateToReminders}
                  className="font-mono-technical text-[10px] uppercase text-[#3d6562] hover:underline"
                >
                  Configure →
                </button>
              </div>

              <div className="space-y-3">
                {reminderQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#fbf9f4] border border-[#15263c]/8 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-editorial text-xs font-semibold text-[#15263c] truncate">
                        {item.clientName} • {item.invoiceNumber}
                      </div>
                      <div className="font-mono-technical text-[10px] text-[#74777d]">
                        {item.relativeDueText} • {item.scheduledText}
                      </div>
                    </div>
                    <span
                      className={`font-mono-technical text-[9px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        item.status === 'sent'
                          ? 'bg-[#15263c] text-[#fbf9f4]'
                          : 'bg-[#15263c]/8 text-[#15263c]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Campaign Direct Launcher Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#ffffff] to-[#eae8e3] border border-[#15263c]/10 shadow-2xs flex flex-col justify-between gap-3">
              <div>
                <span className="font-mono-technical text-[9px] uppercase tracking-[0.2em] text-[#3d6562] block mb-1">
                  GEMINI CREATIVE ENGINE
                </span>
                <h3 className="font-editorial text-sm font-bold text-[#15263c]">
                  Generate Client Campaign or Newsletter
                </h3>
                <p className="font-editorial text-xs text-[#44474d] mt-1 leading-relaxed">
                  Turn a brief thought into an editorial campaign with subject lines, prose, and 1K-4K visuals.
                </p>
              </div>
              <button
                onClick={onNavigateToCampaigns}
                className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#15263c] text-[#fbf9f4] rounded-lg text-xs font-editorial font-semibold hover:bg-[#001126] transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                <span>Launch Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
