import React, { useState } from 'react';
import { Search, Plus, Mail, Building, FileText, Phone } from 'lucide-react';
import { Client, Invoice } from '../types';
import { formatINR } from '../utils/reminderEngine';

interface ClientsViewProps {
  clients: Client[];
  invoices: Invoice[];
  onSelectClientInvoices: (clientId: string) => void;
  onAddInvoiceForClient: (client: Client) => void;
  onAddNewClient: (clientData: Partial<Client>) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  invoices,
  onSelectClientInvoices,
  onAddInvoiceForClient,
  onAddNewClient,
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCin, setNewClientCin] = useState('');
  const [newClientAttn, setNewClientAttn] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Calculate client metrics
  const clientStats = clients.map((cli) => {
    const clientInvoices = invoices.filter((inv) => inv.client_id === cli.id || inv.client_name === cli.name);
    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = clientInvoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const overdueCount = clientInvoices.filter((inv) => inv.status === 'overdue').length;

    return {
      ...cli,
      invoiceCount: clientInvoices.length,
      totalInvoiced,
      pendingAmount,
      overdueCount,
    };
  });

  const filteredClients = clientStats.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.attn && c.attn.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) return;
    onAddNewClient({
      name: newClientName.trim(),
      email: newClientEmail.trim().toLowerCase(),
      cin: newClientCin.trim() || undefined,
      attn: newClientAttn.trim() ? `Attn: ${newClientAttn.trim()}` : undefined,
      phone: newClientPhone.trim() || undefined,
    });
    setNewClientName('');
    setNewClientEmail('');
    setNewClientCin('');
    setNewClientAttn('');
    setNewClientPhone('');
    setShowAddModal(false);
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-extrabold text-[#1a1b22] tracking-tight leading-none">
            CLIENTS
          </h1>
          <p className="text-[#444748] text-sm sm:text-base mt-2">
            Manage your client accounts, contacts, and payment history.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 sm:px-6 py-3.5 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>ADD CLIENT</span>
        </button>
      </div>

      {/* Search Header */}
      <div className="border-t border-[#e3e1ea] pt-4 sm:pt-6 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878]" />
          <input
            type="text"
            placeholder="Search by client name, email, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-[#1a1b22]"
          />
        </div>
        <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-wider">
          {filteredClients.length} Accounts Active
        </span>
      </div>

      {/* Clients Grid / Ledger */}
      <div className="border-t border-[#e3e1ea] divide-y divide-[#e3e1ea]">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f7f7f8] px-3 sm:px-4 -mx-2 sm:-mx-4 rounded-lg transition-colors border border-transparent hover:border-[#e3e1ea]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-[#1a1b22]">
                    {client.name}
                  </span>
                  {client.overdueCount > 0 && (
                    <span className="font-label-caps text-[11px] uppercase text-[#ba1a1a] font-bold">
                      · {client.overdueCount} Overdue
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#747878] mt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={13} className="text-[#747878]" />
                    {client.email}
                  </span>
                  {client.attn && (
                    <>
                      <span>·</span>
                      <span>{client.attn}</span>
                    </>
                  )}
                  {client.cin && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-[11px]">{client.cin}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Financial Metrics & Actions */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#e3e1ea]/60 w-full md:w-auto shrink-0">
                <div className="text-left md:text-right min-w-[90px] sm:min-w-[110px]">
                  <span className="font-label-caps text-[10px] uppercase text-[#747878] font-semibold block mb-0.5">
                    Pending Due
                  </span>
                  <span className={`text-sm sm:text-base font-bold tabular-nums ${
                    client.pendingAmount > 0 ? 'text-[#ba1a1a]' : 'text-[#747878]'
                  }`}>
                    {formatINR(client.pendingAmount)}
                  </span>
                </div>

                <div className="text-left md:text-right min-w-[90px] sm:min-w-[110px]">
                  <span className="font-label-caps text-[10px] uppercase text-[#747878] font-semibold block mb-0.5">
                    Total Invoiced
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#1a1b22] tabular-nums">
                    {formatINR(client.totalInvoiced)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pl-0 md:pl-2">
                  <button
                    onClick={() => onAddInvoiceForClient(client)}
                    className="px-3.5 py-2 min-h-[38px] text-xs font-semibold border border-[#e3e1ea] hover:border-[#1a1b22] rounded-md text-[#1a1b22] hover:bg-[#f4f2fc] transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    + Invoice
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-[#747878]">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-[0.16em]">
                NO CLIENTS YET
              </span>
              <p className="text-xs text-[#444748] leading-relaxed">
                Add client contacts to link them with invoices and automated reminders.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 bg-black hover:bg-[#1c1b1b] text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-label-caps cursor-pointer shadow-xs active:scale-[0.98]"
              >
                + Add Client
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-bold text-[#1a1b22] mb-1">Add Client Account</h3>
            <p className="text-xs text-[#747878] mb-4">Add client details for invoice reminders and follow-ups.</p>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                  Client / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Komorebi Design Lab"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e3e1ea] rounded-md focus:border-[#5b598b] text-sm text-[#1a1b22]"
                />
              </div>

              <div>
                <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                  Primary Finance Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="finance@agency.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e3e1ea] rounded-md focus:border-[#5b598b] text-sm text-[#1a1b22]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Siddharth Roy"
                    value={newClientAttn}
                    onChange={(e) => setNewClientAttn(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e3e1ea] rounded-md focus:border-[#5b598b] text-sm text-[#1a1b22]"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                    CIN / GSTIN / LLPIN
                  </label>
                  <input
                    type="text"
                    placeholder="U74999KA2021PTC"
                    value={newClientCin}
                    onChange={(e) => setNewClientCin(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e3e1ea] rounded-md focus:border-[#5b598b] text-sm text-[#1a1b22]"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                  WhatsApp / Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98450 11223"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e3e1ea] rounded-md focus:border-[#5b598b] text-sm text-[#1a1b22]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e3e1ea]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 min-h-[44px] font-semibold text-xs text-[#747878] hover:text-[#1a1b22] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] bg-black text-white rounded-lg font-semibold text-xs hover:bg-[#1c1b1b] cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
