import React, { useState } from 'react';
import { Client } from '../types';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (cli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>) => void;
  onDeleteClient: (id: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onAddClient,
  onDeleteClient,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onAddClient({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
    });

    setName('');
    setEmail('');
    setPhone('');
    setBillingAddress('');
    setInternalNotes('');
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] px-6 sm:px-14 py-8">
      {/* Header (Exact Image 14) */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-[#44474d] mt-1">
            Keep your client details organized.
          </p>
        </div>
        <button
          onClick={() => {
            setName('Acme Studio');
            setEmail('billing@acme.com');
          }}
          className="inline-flex items-center gap-2 bg-[#001126] text-[#ffffff] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#15263c] transition-all shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add client</span>
        </button>
      </section>

      {/* Dual-State Layout Grid (Exact Image 14) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Directory Empty State or Client Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
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
              {/* Illustration outline with user icon and ambient halo */}
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
                onClick={() => {
                  setName('Acme Studio');
                  setEmail('billing@acme.com');
                }}
                className="inline-flex items-center gap-2 bg-[#001126] text-[#ffffff] px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#15263c] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Add your first client</span>
              </button>
            </div>
          </div>

          {/* If clients exist, show compact summary under */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <span className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d] block">
                Saved Directory Entries ({clients.length})
              </span>
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#ffffff] border border-[#001126]/10 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-[#001126]">{c.name}</h4>
                    <p className="text-xs text-[#44474d]">{c.email}</p>
                  </div>
                  <button
                    onClick={() => onDeleteClient(c.id)}
                    className="text-[#74777d] hover:text-[#ba1a1a] p-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: New Client Form Card (Exact Image 14) (5 cols) */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] mb-1">
                CLIENT OR COMPANY NAME *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setEmail(e.target.value)}
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

            <div className="pt-3 flex items-center justify-between border-t border-[#001126]/10">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setEmail('');
                  setPhone('');
                  setBillingAddress('');
                  setInternalNotes('');
                }}
                className="text-xs font-semibold text-[#44474d] hover:text-[#001126]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#001126] text-[#ffffff] text-xs font-semibold rounded-lg hover:bg-[#15263c] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Save client</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
