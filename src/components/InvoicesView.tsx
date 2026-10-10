import React, { useState } from 'react';
import { Invoice, Client, InvoiceStatus, UserProfile } from '../types';
import { formatCurrency, getCurrencySymbol, SupportedCurrency } from '../utils/currency';

interface InvoicesViewProps {
  invoices: Invoice[];
  clients?: Client[];
  userPreferredCurrency?: 'INR' | 'USD';
  userProfile?: UserProfile;
  onAddInvoice: (inv: Omit<Invoice, 'id'>) => void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
  onDeleteInvoice: (id: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  clients = [],
  userPreferredCurrency = 'INR',
  userProfile,
  onAddInvoice,
  onUpdateStatus,
  onDeleteInvoice,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<Invoice | null>(null);

  // New Invoice Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(userPreferredCurrency);
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Sync default currency when opening modal
  const handleOpenNewModal = () => {
    setCurrency(userPreferredCurrency);
    setAmount('');
    setInvoiceNumber('');
    setDueDate('');
    setDescription('');
    setClientName('');
    setClientEmail('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !amount) return;

    const finalInvoiceNumber =
      invoiceNumber.trim() ||
      `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
    const finalDueDate =
      dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const finalDescription = description.trim() || 'Services rendered';
    const trimmedName = clientName.trim();
    const matchedClient = (clients || []).find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    onAddInvoice({
      invoiceNumber: finalInvoiceNumber,
      clientId: matchedClient ? matchedClient.id : undefined,
      clientName: trimmedName,
      clientEmail: clientEmail.trim() || (matchedClient ? matchedClient.email : `${trimmedName.toLowerCase().replace(/\s+/g, '')}@example.com`),
      amount: parseFloat(amount) || 0,
      currency,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: finalDueDate,
      status: 'pending',
      description: finalDescription,
      items: [
        {
          description: finalDescription,
          quantity: 1,
          rate: parseFloat(amount) || 0,
        },
      ],
      remindersSentCount: 0,
    });

    setIsModalOpen(false);
    setClientName('');
    setClientEmail('');
    setAmount('');
    setInvoiceNumber('');
    setDueDate('');
    setDescription('');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] px-6 sm:px-14 py-8">
      {/* Ambient background bloom */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[480px] h-[480px] bg-[#bfebe6]/40 rounded-full blur-[100px] pointer-events-none opacity-60" />
        <div className="absolute top-1/2 left-1/3 w-[360px] h-[360px] bg-[#eae8e3]/60 rounded-full blur-[80px] pointer-events-none opacity-40" />

        {/* Editorial Header Section */}
        <section className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#15263c] tracking-tight">
              Invoices
            </h1>
            <p className="text-base text-[#44474d] font-normal">
              Create and track invoices in their authentic currencies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNewModal}
              className="btn-action-primary group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#fbf9f4] transition-transform duration-200 group-hover:rotate-90">
                add
              </span>
              <span>New invoice</span>
            </button>
          </div>
        </section>

        {/* Content: Empty State vs Invoices List */}
        {invoices.length === 0 ? (
          <section className="relative z-10 w-full min-h-[580px] flex items-center justify-center py-16 px-4">
            <div className="w-full max-w-2xl bg-[#ffffff]/80 backdrop-blur-md rounded-xl p-10 sm:p-16 flex flex-col items-center text-center shadow-sm border border-[#15263c]/5">
              <div className="relative mb-8 flex items-center justify-center">
                <div className="relative w-28 h-36 rounded-lg bg-[#f5f3ee]/60 flex flex-col items-center justify-center shadow-inner">
                  <svg
                    className="w-16 h-20 text-[#15263c]"
                    fill="none"
                    viewBox="0 0 64 80"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="opacity-90"
                      d="M12 8C12 5.79086 13.7909 4 16 4H38L52 18V72C52 74.2091 50.2091 76 48 76H16C13.7909 76 12 74.2091 12 72V8Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                    <path
                      className="opacity-60"
                      d="M38 4V18H52"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                    <path
                      className="opacity-30"
                      d="M20 28H44"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                    <path
                      className="opacity-30"
                      d="M20 38H44"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                    <circle className="fill-[#3d6562]" cx="43" cy="58" r="2.75" />
                  </svg>
                </div>
              </div>

              <h2 className="text-[28px] leading-[34px] font-bold text-[#15263c] tracking-tight mb-3">
                No invoices yet.
              </h2>
              <p className="text-base text-[#44474d] max-w-md mb-8 leading-relaxed">
                Create your first invoice in your preferred currency ({userPreferredCurrency === 'INR' ? 'INR ₹' : 'USD $'}) to start tracking payments.
              </p>

              <button
                onClick={handleOpenNewModal}
                className="btn-action-primary group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold shadow-md"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] text-[#fbf9f4] transition-transform duration-200 group-hover:scale-110">
                  receipt_long
                </span>
                <span>Create your first invoice</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="relative z-10 w-full space-y-4">
            <div className="bg-[#ffffff]/90 rounded-xl border border-[#15263c]/10 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#15263c]/10 bg-[#f5f3ee] text-[#44474d] font-['Space_Mono'] text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15263c]/8">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#fbf9f4] transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoiceForDetails(inv)}
                    >
                      <td className="py-3.5 px-4 font-['Space_Mono'] text-xs font-semibold text-[#15263c]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#15263c]">
                        {inv.clientName}
                      </td>
                      <td className="py-3.5 px-4 text-[#44474d] truncate max-w-xs">
                        {inv.description}
                      </td>
                      <td className="py-3.5 px-4 font-['Space_Mono'] text-xs text-[#44474d]">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#15263c]">
                        {/* Always use the invoice's own saved currency per Requirement 5 */}
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-['Space_Mono'] text-[9px] uppercase px-2.5 py-0.5 rounded-full font-semibold ${
                            inv.status === 'paid'
                              ? 'bg-[#bfebe6] text-[#00201e]'
                              : inv.status === 'overdue'
                              ? 'bg-[#ffdad6] text-[#ba1a1a]'
                              : 'bg-[#15263c]/8 text-[#15263c]'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceForDetails(inv)}
                            className="px-2.5 py-1 text-xs text-[#15263c] hover:bg-[#15263c]/10 rounded-lg border border-[#15263c]/15 font-medium transition-all duration-150 active:scale-[0.97]"
                            title="View Invoice & PDF Preview"
                          >
                            View
                          </button>
                          {inv.status !== 'paid' ? (
                            <button
                              onClick={() => onUpdateStatus(inv.id, 'paid')}
                              className="px-2.5 py-1 bg-[#3d6562]/10 text-[#3d6562] hover:bg-[#3d6562]/20 rounded-lg text-[11px] font-semibold transition-all duration-150 active:scale-[0.97]"
                              title="Mark invoice as paid"
                            >
                              Mark paid
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(inv.id, 'pending')}
                              className="px-2.5 py-1 bg-[#001126]/10 text-[#001126] hover:bg-[#001126]/20 rounded-lg text-[11px] font-semibold transition-all duration-150 active:scale-[0.97]"
                              title="Mark invoice as pending"
                            >
                              Mark pending
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="text-[#74777d] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 p-1 rounded-lg transition-all duration-150 active:scale-[0.95]"
                            title="Delete invoice"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Invoice Modal with Currency Selector per Requirement 5 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#ffffff] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#15263c]/15 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#15263c]/10">
              <h3 className="text-xl font-bold text-[#15263c]">New Invoice</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#74777d] hover:text-[#001126]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  list="client-suggestions"
                  value={clientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientName(val);
                    const matched = (clients || []).find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
                    if (matched && matched.email) {
                      setClientEmail(matched.email);
                    }
                  }}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 bg-[#fbf9f4] text-sm rounded border border-[#15263c]/15 focus:outline-none focus:border-[#15263c]"
                  required
                />
                <datalist id="client-suggestions">
                  {(clients || []).map((c) => (
                    <option key={c.id} value={c.name}>{c.email}</option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. billing@acme.com"
                  className="w-full px-3 py-2 bg-[#fbf9f4] text-sm rounded border border-[#15263c]/15 focus:outline-none focus:border-[#15263c]"
                />
              </div>

              {/* Currency & Amount Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                    className="w-full px-3 py-2 bg-[#fbf9f4] text-sm font-semibold text-[#001126] rounded border border-[#15263c]/15 focus:outline-none focus:border-[#15263c] cursor-pointer"
                  >
                    <option value="INR">Indian Rupee (INR ₹)</option>
                    <option value="USD">US Dollar (USD $)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                    Amount ({getCurrencySymbol(currency)}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fbf9f4] text-sm font-semibold rounded border border-[#15263c]/15 focus:outline-none focus:border-[#15263c]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fbf9f4] text-sm rounded border border-[#15263c]/15"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fbf9f4] text-sm rounded border border-[#15263c]/15"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#fbf9f4] text-sm rounded border border-[#15263c]/15 resize-y"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[#15263c]/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-action-primary px-5 py-2.5 text-xs font-semibold rounded-lg shadow-sm"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details & PDF View Modal per Requirement 5 */}
      {selectedInvoiceForDetails && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedInvoiceForDetails(null)}
        >
          <div
            className="bg-[#ffffff] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#15263c]/15 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-[#15263c]/10 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Mono'] text-xs font-bold text-[#001126]">
                  {selectedInvoiceForDetails.invoiceNumber}
                </span>
                <span
                  className={`font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                    selectedInvoiceForDetails.status === 'paid'
                      ? 'bg-[#bfebe6] text-[#00201e]'
                      : selectedInvoiceForDetails.status === 'overdue'
                      ? 'bg-[#ffdad6] text-[#ba1a1a]'
                      : 'bg-[#15263c]/8 text-[#15263c]'
                  }`}
                >
                  {selectedInvoiceForDetails.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="btn-action-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForDetails(null)}
                  className="text-[#74777d] hover:text-[#001126] hover:bg-[#15263c]/5 p-1 rounded-lg transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Invoice Document Body */}
            <div className="space-y-6 font-['Hanken_Grotesk'] text-[#1b1c19]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#001126]/10">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#001126] lowercase">
                    dueflow
                  </h2>
                  <p className="text-xs text-[#74777d] mt-1 font-['Space_Mono']">
                    Autonomous Ledger Invoice
                  </p>
                </div>
                <div className="text-left sm:text-right font-['Space_Mono'] text-xs space-y-1">
                  <p className="font-bold text-[#001126]">{selectedInvoiceForDetails.invoiceNumber}</p>
                  <p className="text-[#44474d]">Issue Date: {selectedInvoiceForDetails.issueDate}</p>
                  <p className="text-[#ba1a1a] font-semibold">Due Date: {selectedInvoiceForDetails.dueDate}</p>
                </div>
              </div>

              {/* Billed To & From */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-[#fbf9f4] border border-[#001126]/5 space-y-1">
                  <span className="font-['Space_Mono'] text-[10px] uppercase text-[#74777d] block mb-1">
                    BILLED TO:
                  </span>
                  <p className="text-sm font-bold text-[#001126]">{selectedInvoiceForDetails.clientName}</p>
                  <p className="text-[#44474d]">{selectedInvoiceForDetails.clientEmail}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#fbf9f4] border border-[#001126]/5 space-y-1">
                  <span className="font-['Space_Mono'] text-[10px] uppercase text-[#74777d] block mb-1">
                    PAYABLE TO:
                  </span>
                  <p className="text-sm font-bold text-[#001126]">
                    {userProfile?.beneficiaryName || userProfile?.fullName || 'Business Name'}
                  </p>
                  {userProfile?.email && <p className="text-[#44474d]">{userProfile.email}</p>}
                  {userProfile?.upiId && (
                    <p className="font-['Space_Mono'] text-[11px] text-[#3d6562]">
                      UPI ID: {userProfile.upiId}
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-[#001126]/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f3ee] font-['Space_Mono'] text-[10px] uppercase text-[#74777d]">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#001126]/5">
                    <tr>
                      <td className="p-3 font-medium text-[#001126]">
                        {selectedInvoiceForDetails.description || 'Professional Consulting Services'}
                      </td>
                      <td className="p-3 text-center text-[#74777d]">1</td>
                      <td className="p-3 text-right font-['Space_Mono']">
                        {formatCurrency(selectedInvoiceForDetails.amount, selectedInvoiceForDetails.currency)}
                      </td>
                      <td className="p-3 text-right font-['Space_Mono'] font-bold text-[#001126]">
                        {formatCurrency(selectedInvoiceForDetails.amount, selectedInvoiceForDetails.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#001126] text-[#ffffff] gap-3">
                <div>
                  <span className="font-['Space_Mono'] text-[10px] uppercase text-[#9ec9c4] block">
                    TOTAL AMOUNT DUE ({selectedInvoiceForDetails.currency || 'INR'})
                  </span>
                  <span className="text-xs text-[#c4c6cd]">
                    Currency strictly preserved as per record.
                  </span>
                </div>
                <div className="text-2xl font-bold font-['Space_Mono']">
                  {formatCurrency(selectedInvoiceForDetails.amount, selectedInvoiceForDetails.currency)}
                </div>
              </div>

              {/* Payment instructions note */}
              {userProfile?.paymentInstructions && (
                <div className="p-3.5 rounded-lg bg-[#f0eee9]/50 border border-[#001126]/5 text-xs text-[#44474d]">
                  <span className="font-bold text-[#001126]">Payment Note: </span>
                  {userProfile.paymentInstructions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
