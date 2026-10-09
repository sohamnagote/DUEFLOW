import React, { useState, useMemo } from 'react';
import { Search, Plus, ChevronDown, Zap } from 'lucide-react';
import { Invoice } from '../types';
import { formatINR } from '../utils/reminderEngine';

interface InvoicesViewProps {
  invoices: Invoice[];
  onSelectInvoice: (invoiceId: string) => void;
  onAddInvoice: () => void;
  onTogglePaid: (invoiceId: string) => void;
  onGiveReminderNow?: (invoice: Invoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  onSelectInvoice,
  onAddInvoice,
  onGiveReminderNow,
}) => {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon' | 'scheduled' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'amount' | 'number'>('due_date');

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchesFilter = filter === 'all' ? true : inv.status === filter;
        const matchesSearch =
          inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
          inv.client_name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') return b.amount - a.amount;
        if (sortBy === 'number') return b.invoice_number.localeCompare(a.invoice_number);
        return a.status === 'overdue' ? -1 : 1;
      });
  }, [invoices, filter, search, sortBy]);

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
      due_soon: invoices.filter((i) => i.status === 'due_soon').length,
      scheduled: invoices.filter((i) => i.status === 'scheduled').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
    };
  }, [invoices]);

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] tracking-tight leading-none">
            INVOICES
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            Track all your invoices and automated reminder schedules.
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

      {/* Filter Tabs & Search Controls */}
      <div className="border-t border-[#e3e1ea] pt-4 sm:pt-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#f4f2fc] rounded-lg border border-[#e3e1ea]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#444748] hover:text-[#1a1b22]'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'overdue' ? 'bg-white text-[#ba1a1a] shadow-xs' : 'text-[#444748] hover:text-[#1a1b22]'
            }`}
          >
            Overdue ({counts.overdue})
          </button>
          <button
            onClick={() => setFilter('due_soon')}
            className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'due_soon' ? 'bg-white text-[#5b598b] shadow-xs' : 'text-[#444748] hover:text-[#1a1b22]'
            }`}
          >
            Due Soon ({counts.due_soon})
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'scheduled' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#444748] hover:text-[#1a1b22]'
            }`}
          >
            Scheduled ({counts.scheduled})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'paid' ? 'bg-white text-[#1a1b22] shadow-xs' : 'text-[#444748] hover:text-[#1a1b22]'
            }`}
          >
            Paid ({counts.paid})
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878]" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-[#1a1b22]"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto appearance-none text-xs bg-white border border-[#e3e1ea] rounded-md pl-3 pr-8 py-2 sm:py-1.5 focus:outline-none focus:border-[#5b598b] text-[#1a1b22] cursor-pointer"
            >
              <option value="due_date">Sort: Due Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="number">Sort: Invoice #</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#747878] pointer-events-none" />
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
              className="p-4 bg-white border border-[#e3e1ea] rounded-lg shadow-xs hover:border-[#5b598b] transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
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
                  Due: {inv.due_date}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#e3e1ea]/60 text-xs">
                <div>
                  {inv.status === 'overdue' && (
                    <span className="font-bold text-[#ba1a1a] text-[11px] tracking-wider uppercase">
                      ● OVERDUE
                    </span>
                  )}
                  {inv.status === 'due_soon' && (
                    <span className="font-bold text-[#5b598b] text-[11px] tracking-wider uppercase">
                      ● DUE SOON
                    </span>
                  )}
                  {inv.status === 'paid' && (
                    <span className="font-medium text-[#747878] text-[11px] tracking-wider uppercase">
                      ● PAID
                    </span>
                  )}
                  {inv.status === 'scheduled' && (
                    <span className="font-medium text-[#747878] text-[11px] tracking-wider uppercase">
                      ● SCHEDULED
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#e3e1ea]/70">
                  <span className={`text-[11px] ${inv.reminders_enabled ? 'text-[#5b598b] font-medium' : 'text-[#747878]'}`}>
                    {inv.status === 'paid' ? 'Completed' : inv.reminders_enabled ? 'Reminders Active' : 'Paused'}
                  </span>
                  {inv.status !== 'paid' && onGiveReminderNow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGiveReminderNow(inv);
                      }}
                      className="px-2.5 py-1 bg-[#eeedf6] hover:bg-[#cac6ff] text-[#5b598b] text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Zap size={11} />
                      <span>Remind Now</span>
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
              <th className="py-3.5 px-4 font-semibold uppercase text-left">ISSUE DATE</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">DUE DATE</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">STATUS</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-left">AUTOMATION</th>
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
                  <td className="py-4 px-4 text-[#747878] text-xs whitespace-nowrap">
                    {inv.issue_date}
                  </td>
                  <td className={`py-4 px-4 text-xs font-medium whitespace-nowrap ${
                    inv.status === 'overdue' ? 'text-[#ba1a1a] font-semibold' : 'text-[#1a1b22]'
                  }`}>
                    {inv.due_date}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {inv.status === 'overdue' && (
                      <span className="font-bold text-[#ba1a1a] text-[11px] tracking-wider uppercase">
                        ● OVERDUE
                      </span>
                    )}
                    {inv.status === 'due_soon' && (
                      <span className="font-bold text-[#5b598b] text-[11px] tracking-wider uppercase">
                        ● DUE SOON
                      </span>
                    )}
                    {inv.status === 'paid' && (
                      <span className="font-medium text-[#747878] text-[11px] tracking-wider uppercase">
                        ● PAID
                      </span>
                    )}
                    {inv.status === 'scheduled' && (
                      <span className="font-medium text-[#747878] text-[11px] tracking-wider uppercase">
                        ● SCHEDULED
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-left text-xs whitespace-nowrap">
                    <span className={inv.reminders_enabled ? 'text-[#5b598b] font-medium' : 'text-[#747878]'}>
                      {inv.status === 'paid' ? 'Completed' : inv.reminders_enabled ? 'Reminders Active' : 'Paused'}
                    </span>
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
                        className="px-2.5 py-1.5 bg-[#f4f2fc] hover:bg-[#5b598b] text-[#5b598b] hover:text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Zap size={12} />
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
                <td colSpan={8} className="py-16 text-center text-[#747878]">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-[0.16em]">
                      NO INVOICES FOUND
                    </span>
                    <p className="text-xs text-[#444748] leading-relaxed">
                      You haven&apos;t recorded any invoices yet. Add an invoice to begin automatic follow-ups.
                    </p>
                    <button
                      onClick={onAddInvoice}
                      className="mt-2 bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-label-caps cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      + Add Invoice
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
