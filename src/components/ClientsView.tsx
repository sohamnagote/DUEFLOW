import React, { useState, useRef } from 'react';
import { Client } from '../types';
import { formatCurrency } from '../utils/currency';
import { ClientProcessingAnimation } from './animations/ClientProcessingAnimation';

interface ClientsViewProps {
  clients?: Client[];
  onAddClient: (cli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>) => Promise<boolean | void> | void;
  onDeleteClient: (id: string) => Promise<void> | void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients = [],
  onAddClient,
  onDeleteClient,
}) => {
  // Modal / Drawer state for New Client
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const safeClients: Client[] = Array.isArray(clients)
    ? (clients.filter(Boolean) as Client[])
    : Array.isArray((clients as any)?.clients)
    ? (((clients as any).clients.filter(Boolean)) as Client[])
    : [];

  const filteredClients = safeClients.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.billingAddress && c.billingAddress.toLowerCase().includes(q))
    );
  });

  const handleOpenAddModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setFormError('Client or company name is required.');
      nameInputRef.current?.focus();
      return;
    }

    if (!trimmedEmail) {
      setFormError('Email address is required.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setFormError('Please enter a valid email address (e.g. billing@example.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddClient({
        name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      });

      // Clear form and close modal on confirmed success
      setName('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setInternalNotes('');
      setIsAddModalOpen(false);
      setFormSuccess(`Client "${trimmedName}" created successfully.`);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to create client:', err);
      // Preserves form contents so user doesn't retype
      setFormError(
        err?.message || 'Could not save client to database. Please check required fields and network connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setDeletingId(clientToDelete.id);
    try {
      await onDeleteClient(clientToDelete.id);
      if (selectedClientForDetails?.id === clientToDelete.id) {
        setSelectedClientForDetails(null);
      }
      setClientToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      alert(err?.message || 'Could not delete client.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] text-[#1b1c19] dark:text-[#f3f6fa] px-6 sm:px-14 py-8">
      {/* Header with Auto Layout */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-8">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] dark:text-[#f3f6fa] tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-[#44474d] dark:text-[#94a3b8] mt-1">
            Keep your client directory, contact records, and invoice balances organized.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="create-client-btn"
          aria-label="Add new client"
          className="btn-action-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm self-stretch sm:self-auto cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add client</span>
        </button>
      </section>

      {/* Inline Feedback Banner */}
      {formSuccess && (
        <div className="mb-4 p-3.5 rounded-xl bg-[#3d6562]/10 dark:bg-teal-950/40 border border-[#3d6562]/20 dark:border-teal-500/20 text-[#3d6562] dark:text-[#5eead4] text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-semibold">{formSuccess}</span>
          </div>
          <button onClick={() => setFormSuccess(null)} className="text-[#3d6562] dark:text-[#5eead4] hover:opacity-75 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Main Focus: Full Width Client Directory */}
      <div className="w-full space-y-4">
        {safeClients.length === 0 ? (
          /* Pristine Empty State Card */
          <div className="bg-[#ffffff]/80 dark:bg-[#141f2e]/90 rounded-2xl border border-[#001126]/8 dark:border-white/10 p-8 sm:p-14 relative flex flex-col items-center justify-center min-h-[500px] shadow-2xs text-center">
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#bfebe6]/50 dark:bg-teal-500/10 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-xl bg-[#ffffff] dark:bg-[#0c131d] border border-dashed border-[#001126]/20 dark:border-white/20 flex items-center justify-center shadow-xs">
                <svg className="w-10 h-10 text-[#001126] dark:text-[#f3f6fa]" fill="none" viewBox="0 0 48 48" stroke="currentColor">
                  <circle cx="24" cy="18" r="7" strokeWidth="1.5" />
                  <path d="M12 36C12 29.3726 17.3726 24 24 24C30.6274 24 36 29.3726 36 36" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#001126] dark:text-[#f3f6fa] mb-2 tracking-tight">
              No clients added yet.
            </h2>
            <p className="text-sm text-[#44474d] dark:text-[#94a3b8] max-w-sm mb-6 leading-relaxed">
              Add your first client to associate them with invoices, outstanding balances, and automated reminders.
            </p>

            <button
              onClick={handleOpenAddModal}
              className="btn-action-primary px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.14em] cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Add your first client</span>
            </button>
          </div>
        ) : (
          /* Active Client Directory */
          <div className="bg-[#ffffff]/90 dark:bg-[#141f2e]/95 rounded-2xl border border-[#001126]/10 dark:border-white/10 p-6 sm:p-8 space-y-5 shadow-xs">
            {/* Top Toolbar: Count and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#001126]/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
                  Client Directory
                </h2>
                <span className="font-['Space_Mono'] text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#15263c]/8 dark:bg-white/10 text-[#15263c] dark:text-[#60a5fa] font-semibold">
                  {safeClients.length} {safeClients.length === 1 ? 'client' : 'clients'}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone..."
                  className="w-full px-3 py-2 pl-9 text-xs bg-[#fbf9f4] dark:bg-[#0c131d] rounded-xl border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30 text-[#001126] dark:text-[#f3f6fa] placeholder-[#74777d] dark:placeholder-[#64748b]"
                />
                <span className="material-symbols-outlined text-[16px] text-[#44474d] dark:text-[#94a3b8] absolute left-2.5 top-2.5 pointer-events-none">
                  search
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Client Cards Grid */}
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#74777d] dark:text-[#94a3b8]">
                No clients found matching "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClients.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl bg-[#ffffff] dark:bg-[#192638] border border-[#001126]/10 dark:border-white/10 hover:border-[#001126]/30 dark:hover:border-white/30 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between gap-4 cursor-pointer group active:scale-[0.99]"
                    onClick={() => setSelectedClientForDetails(c)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa] group-hover:text-[#3d6562] dark:group-hover:text-[#5eead4] transition-colors truncate">
                            {c.name || 'Unnamed Client'}
                          </h4>
                          <p className="text-xs text-[#44474d] dark:text-[#94a3b8] truncate mt-0.5">
                            {c.email || 'No email specified'}
                          </p>
                        </div>
                        {c.invoicesCount !== undefined && c.invoicesCount > 0 && (
                          <span className="font-['Space_Mono'] text-[9px] px-2 py-0.5 rounded-full bg-[#bfebe6] dark:bg-teal-950/60 text-[#00201e] dark:text-[#5eead4] font-semibold shrink-0">
                            {c.invoicesCount} {c.invoicesCount === 1 ? 'invoice' : 'invoices'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 pt-1 text-xs text-[#74777d] dark:text-[#94a3b8]">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="material-symbols-outlined text-[14px]">phone</span>
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.billingAddress && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span className="truncate">{c.billingAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Card Footer: Balance & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#001126]/5 dark:border-white/10 text-xs">
                      <div>
                        {c.totalOutstanding && c.totalOutstanding > 0 ? (
                          <span className="font-['Space_Mono'] text-[11px] text-[#ba1a1a] dark:text-[#f87171] font-semibold">
                            Pending: {formatCurrency(c.totalOutstanding, 'INR')}
                          </span>
                        ) : (
                          <span className="font-['Space_Mono'] text-[10px] text-[#3d6562] dark:text-[#5eead4] font-semibold">
                            No pending balance
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedClientForDetails(c)}
                          className="px-2.5 py-1 text-xs text-[#001126] dark:text-[#f3f6fa] hover:bg-[#001126]/5 dark:hover:bg-white/10 rounded-lg border border-[#001126]/10 dark:border-white/10 font-medium cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setClientToDelete(c)}
                          className="p-1 text-[#74777d] dark:text-[#94a3b8] hover:text-[#ba1a1a] dark:hover:text-[#f87171] hover:bg-[#ba1a1a]/10 rounded-lg cursor-pointer"
                          title="Delete client"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Client Slide-over / Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#001126]/15 dark:border-white/10 max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ee] dark:bg-white/10 flex items-center justify-center text-[#001126] dark:text-[#f3f6fa]">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">New Client</h3>
                  <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Add client details for invoices & reminders</p>
                </div>
              </div>
              {!isSubmitting && (
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            {/* If actively saving, show client-card animation */}
            {isSubmitting ? (
              <div className="py-8 flex flex-col items-center justify-center">
                <ClientProcessingAnimation
                  clientName={name}
                  clientEmail={email}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-[#ba1a1a]/10 dark:bg-red-950/40 border border-[#ba1a1a]/20 dark:border-red-500/20 text-[#ba1a1a] dark:text-[#f87171] text-xs flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                    CLIENT OR COMPANY NAME *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="w-full px-3.5 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. billing@acme.com"
                    className="w-full px-3.5 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                    PHONE NUMBER (OPTIONAL)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                    BILLING ADDRESS (OPTIONAL)
                  </label>
                  <textarea
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Street, City, Country, PIN / Postal code"
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                    INTERNAL NOTES (OPTIONAL)
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private notes (payment terms, contact person, etc.)"
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30 resize-y"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2.5 border-t border-[#001126]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                    className="btn-action-secondary px-4 py-2.5 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-action-primary px-5 py-2.5 text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Save client</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Client Detail View Modal */}
      {selectedClientForDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedClientForDetails(null)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#001126]/15 dark:border-white/10 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#bfebe6]/40 dark:bg-teal-950/60 flex items-center justify-center text-[#00201e] dark:text-[#5eead4] font-bold text-base">
                  {selectedClientForDetails.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">
                    {selectedClientForDetails.name}
                  </h3>
                  <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">{selectedClientForDetails.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForDetails(null)}
                className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#fbf9f4] dark:bg-[#0c131d] border border-[#001126]/8 dark:border-white/10">
                <div>
                  <span className="font-['Space_Mono'] text-[9px] uppercase text-[#74777d] dark:text-[#94a3b8] block">
                    INVOICES COUNT
                  </span>
                  <span className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">
                    {selectedClientForDetails.invoicesCount || 0}
                  </span>
                </div>
                <div>
                  <span className="font-['Space_Mono'] text-[9px] uppercase text-[#74777d] dark:text-[#94a3b8] block">
                    OUTSTANDING BALANCE
                  </span>
                  <span className="text-base font-bold text-[#ba1a1a] dark:text-[#f87171]">
                    {formatCurrency(selectedClientForDetails.totalOutstanding || 0, 'INR')}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2.5">
                {selectedClientForDetails.phone && (
                  <div>
                    <span className="font-['Space_Mono'] text-[9px] uppercase text-[#74777d] dark:text-[#94a3b8] block">
                      PHONE
                    </span>
                    <p className="text-[#001126] dark:text-[#f3f6fa] font-medium">{selectedClientForDetails.phone}</p>
                  </div>
                )}
                {selectedClientForDetails.billingAddress && (
                  <div>
                    <span className="font-['Space_Mono'] text-[9px] uppercase text-[#74777d] dark:text-[#94a3b8] block">
                      BILLING ADDRESS
                    </span>
                    <p className="text-[#001126] dark:text-[#f3f6fa] whitespace-pre-wrap">{selectedClientForDetails.billingAddress}</p>
                  </div>
                )}
                {selectedClientForDetails.internalNotes && (
                  <div>
                    <span className="font-['Space_Mono'] text-[9px] uppercase text-[#74777d] dark:text-[#94a3b8] block">
                      INTERNAL NOTES
                    </span>
                    <p className="text-[#44474d] dark:text-[#94a3b8] bg-[#fbf9f4] dark:bg-[#0c131d] p-2.5 rounded-lg border border-[#001126]/5 dark:border-white/10 whitespace-pre-wrap">
                      {selectedClientForDetails.internalNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-[#001126]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(selectedClientForDetails);
                }}
                className="text-xs text-[#ba1a1a] dark:text-[#f87171] hover:bg-[#ba1a1a]/10 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Delete Client
              </button>
              <button
                type="button"
                onClick={() => setSelectedClientForDetails(null)}
                className="btn-action-primary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !deletingId && setClientToDelete(null)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#001126]/15 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#ba1a1a] dark:text-[#f87171]">
              <div className="p-2.5 rounded-full bg-[#ba1a1a]/10 dark:bg-red-950/50">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">Delete Client</h3>
                <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Confirm client deletion</p>
              </div>
            </div>

            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#001126] dark:text-[#f3f6fa]">{clientToDelete.name}</strong>? Existing invoices created for this client will be preserved.
            </p>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-[#001126]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={deletingId !== null}
                className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="btn-action-danger px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {deletingId ? 'Deleting...' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
