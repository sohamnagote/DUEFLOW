import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Plus, ArrowRight, Zap, MessageSquare, Mail } from 'lucide-react';
import { Invoice, ActivityItem } from '../types';
import { formatINR } from '../utils/reminderEngine';

interface DashboardViewProps {
  invoices: Invoice[];
  activities: ActivityItem[];
  onSelectInvoice: (invoiceId: string) => void;
  onAddInvoice: () => void;
  onViewAllInvoices: () => void;
  onGiveReminderNow?: (invoice: Invoice) => void;
  onOpenConnectChannels?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  activities,
  onSelectInvoice,
  onAddInvoice,
  onViewAllInvoices,
  onGiveReminderNow,
  onOpenConnectChannels,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due_soon' | 'overdue' | 'paid' | 'scheduled'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'amount' | 'number'>('due_date');

  // Aggregated Metrics
  const metrics = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let overdueCount = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        paid += inv.amount;
      } else {
        outstanding += inv.amount;
        if (inv.status === 'overdue') {
          overdue += inv.amount;
          overdueCount += 1;
        }
      }
    });

    return {
      outstanding,
      overdue,
      paid,
      totalCount: invoices.length,
      overdueCount,
    };
  }, [invoices]);

  // Filter and Sort Table
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchesSearch =
          inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.client_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ? true : inv.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') return b.amount - a.amount;
        if (sortBy === 'number') return b.invoice_number.localeCompare(a.invoice_number);
        // due date order: overdue & due soon first
        return a.status === 'overdue' ? -1 : 1;
      });
  }, [invoices, searchQuery, statusFilter, sortBy]);

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 font-bold text-[#ba1a1a] text-[11px] tracking-[0.14em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
            OVERDUE
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1.5 font-bold text-[#5b598b] text-[11px] tracking-[0.14em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b598b]"></span>
            DUE SOON
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-[#747878] text-[11px] tracking-[0.14em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#747878]"></span>
            PAID
          </span>
        );
      case 'scheduled':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-[#747878] text-[11px] tracking-[0.14em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c4c7c7]"></span>
            SCHEDULED
          </span>
        );
    }
  };

  const getReminderLabel = (invoice: Invoice) => {
    if (invoice.status === 'paid') return <span className="text-[#747878]">Cancelled</span>;
    if (invoice.status === 'overdue') return <span className="text-[#5b598b]">Sent (+3d Late)</span>;
    if (invoice.status === 'due_soon') return <span className="text-[#5b598b]">Scheduled (Due Date)</span>;
    return <span className="text-[#747878]">Scheduled (T-3d)</span>;
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] tracking-tight leading-none">
            DASHBOARD
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            A clear view of what needs your attention.
          </p>
        </div>

        <button
          onClick={onAddInvoice}
          className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 sm:px-6 py-3.5 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>ADD INVOICE</span>
        </button>
      </div>

      {/* Multi-Channel Integrations Banner */}
      <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-[#fbf8ff] border border-[#cac6ff]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5b598b] text-white flex items-center justify-center font-bold shrink-0">
            <Zap size={16} />
          </div>
          <div className="text-xs">
            <span className="font-bold text-[#1a1b22] block">
              Multi-Channel Reminder Automation
            </span>
            <span className="text-[#747878]">
              Automated email reminders and 1-click WhatsApp follow-ups ready for all unpaid invoices.
            </span>
          </div>
        </div>

        {onOpenConnectChannels && (
          <button
            type="button"
            onClick={onOpenConnectChannels}
            className="text-xs font-bold text-[#5b598b] hover:text-[#18173a] hover:underline flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Connect &amp; Manage Channels</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* 2. Monumental Metric Grid */}
      <div className="border-t border-b border-[#e3e1ea] py-4 sm:py-6 my-4 sm:my-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Outstanding */}
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col justify-center bg-[#fbf8ff] sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-[#e3e1ea]/60">
            <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold block mb-1">
              OUTSTANDING
            </span>
            <div className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#1a1b22] tracking-tight tabular-nums truncate">
              {formatINR(metrics.outstanding)}
            </div>
          </div>

          {/* Overdue */}
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col justify-center bg-[#fff8f7] sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-[#e3e1ea]/60">
            <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold block mb-1">
              OVERDUE
            </span>
            <div className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#ba1a1a] tracking-tight tabular-nums truncate">
              {formatINR(metrics.overdue)}
            </div>
          </div>

          {/* Paid */}
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col justify-center bg-[#fbf8ff] sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-[#e3e1ea]/60">
            <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold block mb-1">
              PAID
            </span>
            <div className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#1a1b22] tracking-tight tabular-nums truncate">
              {formatINR(metrics.paid)}
            </div>
          </div>

          {/* Total Invoices */}
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col justify-center bg-[#fbf8ff] sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-[#e3e1ea]/60">
            <span className="font-label-caps text-[10px] sm:text-[11px] uppercase text-[#747878] tracking-[0.14em] font-semibold block mb-1">
              INVOICES
            </span>
            <div className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#1a1b22] tracking-tight tabular-nums truncate">
              {metrics.totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Invoices Table Header & Filter Bar */}
      <div className="mt-8 sm:mt-12 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <h2 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22]">
          INVOICES ({filteredInvoices.length})
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878]" />
            <input
              type="text"
              placeholder="Search invoice or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-[#1a1b22] placeholder-[#747878]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full appearance-none text-xs bg-white border border-[#e3e1ea] rounded-md pl-3 pr-8 py-2 sm:py-1.5 focus:outline-none focus:border-[#5b598b] text-[#1a1b22] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="due_soon">Due Soon</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#747878] pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none text-xs bg-white border border-[#e3e1ea] rounded-md pl-3 pr-8 py-2 sm:py-1.5 focus:outline-none focus:border-[#5b598b] text-[#1a1b22] cursor-pointer"
              >
                <option value="due_date">Sort: Due Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="number">Sort: Invoice #</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#747878] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="sm:hidden space-y-3 border-t border-[#e3e1ea] pt-3">
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice(inv.id)}
              className="p-4 bg-white border border-[#e3e1ea] rounded-lg shadow-xs hover:border-[#5b598b] transition-all cursor-pointer active:scale-[0.99] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#1a1b22]">{inv.invoice_number}</span>
                <span className="font-extrabold text-sm text-[#1a1b22] tabular-nums">
                  {formatINR(inv.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#444748] font-medium truncate max-w-[180px]">{inv.client_name}</span>
                <span className={inv.status === 'overdue' ? 'text-[#ba1a1a] font-semibold' : 'text-[#747878]'}>
                  Due {inv.due_date}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#e3e1ea]/60 text-xs">
                <div>{getStatusBadge(inv.status)}</div>
                <div className="flex items-center gap-2">
                  <span className="text-right text-[11px] font-medium">{getReminderLabel(inv)}</span>
                  {inv.status !== 'paid' && onGiveReminderNow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGiveReminderNow(inv);
                      }}
                      className="px-2 py-0.5 bg-[#eeedf6] hover:bg-[#cac6ff] text-[#5b598b] text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Zap size={10} />
                      <span>Remind</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-[#747878] text-xs">
            No invoices found matching criteria.
          </div>
        )}
      </div>

      {/* Desktop & Tablet Invoices Ledger Table (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto border-t border-[#e3e1ea]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#e3e1ea] text-[#747878] font-label-caps text-[11px] tracking-[0.14em]">
              <th className="py-3.5 pr-4 font-semibold uppercase text-left">INVOICE</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">CLIENT</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-right">AMOUNT</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">DUE</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">STATUS</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">REMINDER</th>
              <th className="py-3.5 pl-4 font-semibold uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e3e1ea]">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv.id)}
                  className="group hover:bg-[#f7f7f8] transition-colors cursor-pointer"
                >
                  <td className="py-4 pr-4 font-semibold text-[#1a1b22] whitespace-nowrap text-left">
                    {inv.invoice_number}
                  </td>
                  <td className="py-4 px-4 text-[#1a1b22] font-medium whitespace-nowrap text-left">
                    {inv.client_name}
                  </td>
                  <td className="py-4 px-4 text-[#1a1b22] font-semibold tabular-nums whitespace-nowrap text-right">
                    {formatINR(inv.amount)}
                  </td>
                  <td className={`py-4 px-4 font-medium whitespace-nowrap text-left ${
                    inv.status === 'overdue' ? 'text-[#ba1a1a]' : 'text-[#1a1b22]'
                  }`}>
                    {inv.due_date}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-left">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-4 px-4 text-left text-xs whitespace-nowrap font-medium">
                    {getReminderLabel(inv)}
                  </td>
                  <td className="py-4 pl-4 text-right whitespace-nowrap">
                    {inv.status !== 'paid' && onGiveReminderNow ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGiveReminderNow(inv);
                        }}
                        title="Give reminder now via Email & WhatsApp"
                        className="px-2.5 py-1 bg-[#f4f2fc] hover:bg-[#5b598b] text-[#5b598b] hover:text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Zap size={11} />
                        <span>Remind Now</span>
                      </button>
                    ) : (
                      <span className="text-[#c4c7c7] text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[#747878] text-sm">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-[0.16em]">
                      LEDGER EMPTY
                    </span>
                    <p className="text-xs text-[#444748] leading-relaxed">
                      No invoices recorded yet. Create an invoice once, and DueFlow will handle the automated 4-step follow-up.
                    </p>
                    <button
                      onClick={onAddInvoice}
                      className="mt-2 bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-label-caps cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      + Create First Invoice
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Recent Activity Section */}
      <div className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-label-caps text-[12px] font-bold uppercase tracking-[0.16em] text-[#1a1b22]">
            RECENT ACTIVITY
          </h2>
          {activities.length > 0 && (
            <button 
              onClick={onViewAllInvoices}
              className="text-xs text-[#5b598b] hover:text-[#18173a] font-medium inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        <div className="border-t border-[#e3e1ea] divide-y divide-[#e3e1ea]">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#1a1b22]">{act.invoice_number}</span>
                  <span className="text-[#747878]">·</span>
                  <span className={act.status_tone === 'error' ? 'text-[#ba1a1a] font-medium' : 'text-[#444748]'}>
                    {act.message}
                  </span>
                </div>
                <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-wider font-semibold">
                  {act.time_ago}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-[#747878]">
              No reminder or payment activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
