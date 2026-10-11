import React, { useState, useRef } from 'react';
import { Client } from '../types';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const safeClients = (clients || []).filter(Boolean);
  const filteredClients = safeClients.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const handleFocusNewClient = () => {
    setFormError(null);
    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameInputRef.current?.focus();
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

      // Clear form only on confirmed success
      setName('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setInternalNotes('');
      setFormSuccess(`Client "${trimmedName}" created successfully.`);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to create client:', err);
      setFormError(
        err?.message || 'Could not save client to database. Please check required fields and network connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteClient(id);
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      alert(err?.message || 'Could not delete client.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] px-6 sm:px-14 py-8">
      {/* Header with Auto Layout */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-8">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-[#44474d] mt-1">
            Keep your client details organized.
          </p>
        </div>
        <button
          onClick={handleFocusNewClient}
          id="create-client-btn"
          aria-label="Add new client"
          className="btn-action-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm self-stretch sm:self-auto cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add client</span>
        </button>
      </section>

      {/* Dual-State Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Directory Empty State or Client Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {safeClients.length === 0 ? (
            /* Pristine Empty State Card */
            <div className="bg-[#ffffff]/80 rounded-2xl border border-[#001126]/8 p-8 sm:p-14 relative flex flex-col items-center justify-between min-h-[540px] shadow-2xs">
              {/* Top Left Dot Matrix */}
              <div className="absolute top-6 left-6 grid grid-cols-2 gap-1.5 opacity-25">
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
              </div>

              {/* Bottom Right Dot Matrix */}
              <div className="absolute bottom-6 right-6 grid grid-cols-2 gap-1.5 opacity-25">
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#001126]" />
              </div>

              <div />

              {/* Center Content */}
              <div className="flex flex-col items-center text-center my-auto">
                <div className="relative mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#bfebe6]/50 rounded-2xl blur-xl" />
                  <div className="relative w-20 h-20 rounded-xl bg-[#ffffff] border border-dashed border-[#001126]/20 flex items-center justify-center shadow-xs">
                    <svg className="w-10 h-10 text-[#001126]" fill="none" viewBox="0 0 48 48" stroke="currentColor">
                      <circle cx="24" cy="18" r="7" strokeWidth="1.5" />
                      <path d="M12 36C12 29.3726 17.3726 24 24 24C30.6274 24 36 29.3726 36 36" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-[#001126] mb-2 tracking-tight">
                  No clients added yet.
                </h2>
                <p className="text-sm text-[#44474d] max-w-sm mb-6 leading-relaxed">
                  Add a client to associate them with invoices and payment reminders.
                </p>

                <button
                  onClick={handleFocusNewClient}
                  className="btn-action-primary px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.14em] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Add your first client</span>
                </button>
              </div>

              <div />
            </div>
          ) : (
            /* Active Client Directory */
            <div className="bg-[#ffffff]/80 rounded-2xl border border-[#001126]/10 p-6 sm:p-8 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#001126]/10">
                <div>
                  <h2 className="text-lg font-bold text-[#001126]">
                    Client Directory
                  </h2>
                  <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]">
                    {safeClients.length} saved {safeClients.length === 1 ? 'client' : 'clients'}
                  </span>
                </div>
                {safeClients.length > 3 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search clients..."
                      className="px-3 py-1.5 pl-8 text-xs bg-[#fbf9f4] rounded-lg border border-[#001126]/15 focus:outline-none focus:border-[#001126] w-full sm:w-48"
                    />
                    <span className="material-symbols-outlined text-[16px] text-[#44474d] absolute left-2 top-2">
                      search
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredClients.length === 0 ? (
                  <p className="text-xs text-[#74777d] py-6 text-center">
                    No clients matching "{searchQuery}".
                  </p>
                ) : (
                  filteredClients.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-[#ffffff] border border-[#001126]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#001126]/25 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#001126] truncate">
                            {c.name || 'Unnamed Client'}
                          </h4>
                          {c.invoicesCount !== undefined && c.invoicesCount > 0 && (
                            <span className="font-['Space_Mono'] text-[9px] px-1.5 py-0.5 rounded bg-[#bfebe6] text-[#00201e] font-semibold">
                              {c.invoicesCount} {c.invoicesCount === 1 ? 'inv' : 'invs'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#44474d] truncate">
                          {c.email || 'No email provided'}
                        </p>
                        {c.phone && (
                          <p className="text-[11px] text-[#74777d] truncate">
                            Phone: {c.phone}
                          </p>
                        )}
                        {c.billingAddress && (
                          <p className="text-[11px] text-[#74777d] truncate">
                            Address: {c.billingAddress}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          className="btn-action-danger p-2 rounded-lg cursor-pointer disabled:opacity-50"
                          title="Delete client"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {deletingId === c.id ? 'progress_activity' : 'delete'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: New Client Form Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#ffffff]/90 rounded-2xl border border-[#001126]/10 p-6 sm:p-7 shadow-xs space-y-5">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#f5f3ee] flex items-center justify-center text-[#001126]">
                <span className="material-symbols-outlined text-[18px]">badge</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#001126]">
                  New Client
                </h3>
              </div>
            </div>
            <span className="font-['Space_Mono'] text-[9px] uppercase px-2 py-0.5 rounded bg-[#bfebe6] text-[#00201e] font-semibold">
              DRAFT
            </span>
          </div>

          {/* Inline Error Banner */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-[#ba1a1a]/10 border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span className="leading-snug">{formError}</span>
            </div>
          )}

          {/* Inline Success Banner */}
          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-[#3d6562]/10 border border-[#3d6562]/20 text-[#3d6562] text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
              <span className="leading-snug">{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] mb-1">
                CLIENT OR COMPANY NAME *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Acme Studio"
                className="w-full px-3.5 py-2.5 bg-[#ffffff] text-sm rounded-[4px] border border-[#001126]/15 focus:outline-none focus:border-[#001126]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] mb-1">
                EMAIL ADDRESS *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. billing@acme.com"
                className="w-full px-3.5 py-2.5 bg-[#ffffff] text-sm rounded-[4px] border border-[#001126]/15 focus:outline-none focus:border-[#001126]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                  PHONE NUMBER
                </label>
                <span className="font-['Space_Mono'] text-[9px] text-[#44474d]/70">OPTIONAL</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-[#ffffff] text-sm rounded-[4px] border border-[#001126]/15"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                  BILLING ADDRESS
                </label>
                <span className="font-['Space_Mono'] text-[9px] text-[#44474d]/70">OPTIONAL</span>
              </div>
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={2}
                placeholder="Street address, Tax ID, City, Postal Code"
                className="w-full p-3 bg-[#ffffff] text-sm rounded-[4px] border border-[#001126]/15 resize-y"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d]">
                  INTERNAL NOTES
                </label>
                <span className="font-['Space_Mono'] text-[9px] text-[#44474d]/70">OPTIONAL</span>
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                placeholder="Preferred payment terms, schedule reminders..."
                className="w-full p-3 bg-[#ffffff] text-sm rounded-[4px] border border-[#001126]/15 resize-y"
              />
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-t border-[#001126]/10">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setName('');
                  setEmail('');
                  setPhone('');
                  setBillingAddress('');
                  setInternalNotes('');
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="btn-action-secondary w-full sm:w-auto px-4 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-action-primary w-full sm:w-auto px-6 py-2.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Saving client...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Save client</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
