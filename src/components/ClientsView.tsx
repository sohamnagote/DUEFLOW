import React, { useState, useRef } from 'react';
import { Client } from '../types';
import { formatCurrency } from '../utils/currency';
import { ClientProcessingAnimation } from './animations/ClientProcessingAnimation';

interface ClientsViewProps {
  clients?: Client[];
  onAddClient: (cli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>) => Promise<boolean | void> | void;
  onUpdateClient?: (id: string, patch: Partial<Client>) => Promise<boolean | void> | void;
  onDeleteClient: (id: string) => Promise<void> | void;
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5/-4)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6/-5)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT, UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8/-7)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, UTC+10/+11)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
  { key: 'SUNDAY', label: 'Sun' },
];

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  // Modal / Drawer state for New Client
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // New Client Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Communication Preferences for New Client
  const [preferredTone, setPreferredTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [allowedDays, setAllowedDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('18:00');
  const [automatedRemindersEnabled, setAutomatedRemindersEnabled] = useState(true);
  const [communicationNotes, setCommunicationNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Detail Modal Edit State
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editTone, setEditTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
  const [editTimezone, setEditTimezone] = useState('Asia/Kolkata');
  const [editAllowedDays, setEditAllowedDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [editWindowStart, setEditWindowStart] = useState('09:00');
  const [editWindowEnd, setEditWindowEnd] = useState('18:00');
  const [editRemindersEnabled, setEditRemindersEnabled] = useState(true);
  const [editNotes, setEditNotes] = useState('');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setName('');
    setEmail('');
    setPhone('');
    setBillingAddress('');
    setInternalNotes('');
    setPreferredTone('professional');
    setTimezone('Asia/Kolkata');
    setAllowedDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    setWindowStart('09:00');
    setWindowEnd('18:00');
    setAutomatedRemindersEnabled(true);
    setCommunicationNotes('');
    setIsAddModalOpen(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const toggleDay = (day: string) => {
    setAllowedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const toggleEditDay = (day: string) => {
    setEditAllowedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const handleSelectClientForDetails = (client: Client) => {
    setSelectedClientForDetails(client);
    setIsEditingPreferences(false);
    setEditError(null);
    setEditTone(((client.preferredTone || client.reminderTone) as any) || 'professional');
    setEditTimezone(client.timezone || 'Asia/Kolkata');
    setEditAllowedDays(
      Array.isArray(client.allowedDays) && client.allowedDays.length > 0
        ? client.allowedDays
        : typeof client.allowedDays === 'string'
        ? client.allowedDays.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    );
    setEditWindowStart(client.communicationWindowStart || '09:00');
    setEditWindowEnd(client.communicationWindowEnd || '18:00');
    setEditRemindersEnabled(client.automatedRemindersEnabled !== false);
    setEditNotes(client.communicationNotes || '');
  };

  const handleSavePreferences = async () => {
    if (!selectedClientForDetails || !onUpdateClient) return;
    setIsSavingPreferences(true);
    setEditError(null);
    try {
      const patch: Partial<Client> = {
        preferredTone: editTone,
        timezone: editTimezone,
        allowedDays: editAllowedDays,
        communicationWindowStart: editWindowStart,
        communicationWindowEnd: editWindowEnd,
        automatedRemindersEnabled: editRemindersEnabled,
        communicationNotes: editNotes.trim() || undefined,
      };
      await onUpdateClient(selectedClientForDetails.id, patch);
      setSelectedClientForDetails({
        ...selectedClientForDetails,
        ...patch,
      });
      setIsEditingPreferences(false);
    } catch (err: any) {
      console.error('Failed to update client preferences:', err);
      setEditError(err?.message || 'Could not save communication preferences.');
    } finally {
      setIsSavingPreferences(false);
    }
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
        preferredTone,
        preferredChannel: 'email',
        timezone,
        allowedDays,
        communicationWindowStart: windowStart,
        communicationWindowEnd: windowEnd,
        automatedRemindersEnabled,
        communicationNotes: communicationNotes.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setFormSuccess(`Client "${trimmedName}" created with custom communication preferences.`);
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

  const formatDaysSummary = (days?: string[] | string) => {
    if (!days) return 'Mon-Fri';
    const dayList = Array.isArray(days)
      ? days
      : days.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (dayList.length === 0) return 'Mon-Fri';
    if (dayList.length === 7) return 'Everyday';
    if (
      dayList.length === 5 &&
      dayList.includes('MONDAY') &&
      dayList.includes('TUESDAY') &&
      dayList.includes('WEDNESDAY') &&
      dayList.includes('THURSDAY') &&
      dayList.includes('FRIDAY')
    ) {
      return 'Mon-Fri';
    }
    const shortNames: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun',
    };
    return dayList.map((d: string) => shortNames[d] || d).join(', ');
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] text-[#1b1c19] dark:text-[#f3f6fa] px-6 sm:px-14 py-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-8">
        <div>
          <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#001126] dark:text-[#f3f6fa] tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-[#44474d] dark:text-[#94a3b8] mt-1">
            Configure client contact records, reminder tones, and smart communication windows.
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

      {/* Directory Card */}
      <div className="w-full space-y-4">
        {safeClients.length === 0 ? (
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
              Add your first client to configure personalized reminder tones, communication windows, and automated follow-ups.
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
          <div className="bg-[#ffffff]/90 dark:bg-[#141f2e]/95 rounded-2xl border border-[#001126]/10 dark:border-white/10 p-6 sm:p-8 space-y-5 shadow-xs">
            {/* Top Toolbar */}
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
                {filteredClients.map((c) => {
                  const tone = (c.preferredTone || 'professional').toLowerCase();
                  const start = c.communicationWindowStart || '09:00';
                  const end = c.communicationWindowEnd || '18:00';
                  const tz = c.timezone || 'Asia/Kolkata';
                  const isRemindersOn = c.automatedRemindersEnabled !== false;

                  return (
                    <div
                      key={c.id}
                      className="p-5 rounded-xl bg-[#ffffff] dark:bg-[#192638] border border-[#001126]/10 dark:border-white/10 hover:border-[#001126]/30 dark:hover:border-white/30 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between gap-4 cursor-pointer group active:scale-[0.99]"
                      onClick={() => handleSelectClientForDetails(c)}
                    >
                      <div className="space-y-3">
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

                        {/* Communication Preferences Summary Pill */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#001126]/5 dark:bg-white/10 text-[#001126] dark:text-[#f3f6fa] font-medium capitalize">
                            <span className="material-symbols-outlined text-[12px]">tune</span>
                            {tone} tone
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#001126]/5 dark:bg-white/10 text-[#44474d] dark:text-[#94a3b8] font-mono">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {start}-{end} ({tz.split('/')[1] || tz})
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#001126]/5 dark:bg-white/10 text-[#44474d] dark:text-[#94a3b8]">
                            {formatDaysSummary(c.allowedDays)}
                          </span>
                          {!isRemindersOn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                              <span className="material-symbols-outlined text-[12px]">pause_circle</span>
                              Reminders paused
                            </span>
                          )}
                        </div>

                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-[#74777d] dark:text-[#94a3b8] truncate">
                            <span className="material-symbols-outlined text-[14px]">phone</span>
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#001126]/5 dark:border-white/10 text-xs">
                        <div>
                          {c.totalOutstanding && c.totalOutstanding > 0 ? (
                            <span className="text-[11px] text-[#ba1a1a] dark:text-[#f87171] font-semibold tabular-nums">
                              Pending: {formatCurrency(c.totalOutstanding, 'INR')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#3d6562] dark:text-[#5eead4] font-medium">
                              No pending balance
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectClientForDetails(c)}
                            className="px-2.5 py-1 text-xs text-[#001126] dark:text-[#f3f6fa] hover:bg-[#001126]/5 dark:hover:bg-white/10 rounded-lg border border-[#001126]/10 dark:border-white/10 font-medium cursor-pointer"
                          >
                            Preferences & Info
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
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#001126]/15 dark:border-white/10 max-h-[92vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ee] dark:bg-white/10 flex items-center justify-center text-[#001126] dark:text-[#f3f6fa]">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#001126] dark:text-[#f3f6fa]">New Client</h3>
                  <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Add contact and communication settings</p>
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

            {isSubmitting ? (
              <div className="py-8 flex flex-col items-center justify-center">
                <ClientProcessingAnimation
                  clientName={name}
                  clientEmail={email}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-[#ba1a1a]/10 dark:bg-red-950/40 border border-[#ba1a1a]/20 dark:border-red-500/20 text-[#ba1a1a] dark:text-[#f87171] text-xs flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#001126] dark:text-[#f3f6fa] uppercase tracking-wider">
                    Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        CLIENT / COMPANY *
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Acme Studio"
                        className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
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
                        placeholder="billing@acme.com"
                        className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        PHONE NUMBER
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        BILLING ADDRESS
                      </label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Street, City, PIN"
                        className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126] dark:focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Communication Preferences Section */}
                <div className="p-4 rounded-xl bg-[#fbf9f4] dark:bg-[#0c131d] border border-[#001126]/10 dark:border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#001126] dark:text-[#f3f6fa] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#3d6562] dark:text-[#5eead4]">tune</span>
                        Communication Preferences
                      </h4>
                      <p className="text-[11px] text-[#74777d] dark:text-[#94a3b8]">
                        Controls how & when DueFlow sends automated invoice follow-ups.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[11px] font-medium text-[#44474d] dark:text-[#94a3b8]">Automated Reminders</span>
                      <input
                        type="checkbox"
                        checked={automatedRemindersEnabled}
                        onChange={(e) => setAutomatedRemindersEnabled(e.target.checked)}
                        className="accent-[#3d6562] w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Reminder Tone */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44474d] dark:text-[#94a3b8] mb-1.5">
                      PREFERRED REMINDER TONE
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['friendly', 'professional', 'firm'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPreferredTone(t)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-medium capitalize border transition-colors cursor-pointer ${
                            preferredTone === t
                              ? 'bg-[#001126] dark:bg-white text-white dark:text-[#001126] border-transparent shadow-xs'
                              : 'bg-white dark:bg-[#141f2e] text-[#44474d] dark:text-[#94a3b8] border-[#001126]/10 dark:border-white/10 hover:border-[#001126]/30'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timezone & Window */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        CLIENT TIMEZONE
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none focus:border-[#001126]"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        COMMUNICATION WINDOW
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={windowStart}
                          onChange={(e) => setWindowStart(e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none"
                        />
                        <span className="text-xs text-[#74777d] dark:text-[#94a3b8]">to</span>
                        <input
                          type="time"
                          value={windowEnd}
                          onChange={(e) => setWindowEnd(e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Allowed Days */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44474d] dark:text-[#94a3b8] mb-1.5">
                      ALLOWED COMMUNICATION DAYS
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((w) => {
                        const active = allowedDays.includes(w.key);
                        return (
                          <button
                            key={w.key}
                            type="button"
                            onClick={() => toggleDay(w.key)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#3d6562] dark:bg-[#5eead4] text-white dark:text-[#00201e] border-transparent'
                                : 'bg-white dark:bg-[#141f2e] text-[#74777d] dark:text-[#94a3b8] border-[#001126]/10 dark:border-white/10'
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Communication Notes */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                      COMMUNICATION INSTRUCTION / NOTE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={communicationNotes}
                      onChange={(e) => setCommunicationNotes(e.target.value)}
                      placeholder="e.g. Avoid calling during month-end closes; prefers morning email."
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-2 flex justify-end gap-2.5 border-t border-[#001126]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                    className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-action-primary px-5 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Save client</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Client Detail View & Preferences Modal */}
      {selectedClientForDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedClientForDetails(null)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#001126]/15 dark:border-white/10 my-8 max-h-[92vh] overflow-y-auto"
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
              {/* Financial Balance Summary */}
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

              {/* Communication Preferences Section */}
              <div className="p-4 rounded-xl bg-[#fbf9f4] dark:bg-[#0c131d] border border-[#001126]/10 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#3d6562] dark:text-[#5eead4]">tune</span>
                    <span className="font-bold text-[#001126] dark:text-[#f3f6fa]">Communication Preferences</span>
                  </div>
                  {onUpdateClient && !isEditingPreferences && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPreferences(true)}
                      className="px-2 py-1 text-[11px] font-semibold text-[#3d6562] dark:text-[#5eead4] hover:bg-[#3d6562]/10 rounded-md transition-colors cursor-pointer"
                    >
                      Edit Preferences
                    </button>
                  )}
                </div>

                {editError && (
                  <div className="p-2.5 rounded-lg bg-[#ba1a1a]/10 text-[#ba1a1a] dark:text-[#f87171] text-xs">
                    {editError}
                  </div>
                )}

                {isEditingPreferences ? (
                  <div className="space-y-3 pt-1">
                    {/* Tone Select */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        Reminder Tone
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['friendly', 'professional', 'firm'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditTone(t)}
                            className={`py-1 px-2 rounded-lg text-xs font-medium capitalize border cursor-pointer ${
                              editTone === t
                                ? 'bg-[#001126] dark:bg-white text-white dark:text-[#001126] border-transparent'
                                : 'bg-white dark:bg-[#141f2e] text-[#44474d] dark:text-[#94a3b8] border-[#001126]/10 dark:border-white/10'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        Timezone
                      </label>
                      <select
                        value={editTimezone}
                        onChange={(e) => setEditTimezone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10 focus:outline-none"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Window */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        Send Window
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={editWindowStart}
                          onChange={(e) => setEditWindowStart(e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10"
                        />
                        <span className="text-xs text-[#74777d] dark:text-[#94a3b8]">to</span>
                        <input
                          type="time"
                          value={editWindowEnd}
                          onChange={(e) => setEditWindowEnd(e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10"
                        />
                      </div>
                    </div>

                    {/* Allowed Days */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        Allowed Days
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {WEEKDAYS.map((w) => {
                          const active = editAllowedDays.includes(w.key);
                          return (
                            <button
                              key={w.key}
                              type="button"
                              onClick={() => toggleEditDay(w.key)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold border cursor-pointer ${
                                active
                                  ? 'bg-[#3d6562] dark:bg-[#5eead4] text-white dark:text-[#00201e] border-transparent'
                                  : 'bg-white dark:bg-[#141f2e] text-[#74777d] dark:text-[#94a3b8] border-[#001126]/10'
                              }`}
                            >
                              {w.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reminders Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-[#44474d] dark:text-[#94a3b8]">
                        Automated Reminders Enabled
                      </span>
                      <input
                        type="checkbox"
                        checked={editRemindersEnabled}
                        onChange={(e) => setEditRemindersEnabled(e.target.checked)}
                        className="accent-[#3d6562] w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#44474d] dark:text-[#94a3b8] mb-1">
                        Communication Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Preferences or special instructions..."
                        className="w-full px-2.5 py-1 bg-white dark:bg-[#141f2e] text-[#001126] dark:text-[#f3f6fa] text-xs rounded-lg border border-[#001126]/15 dark:border-white/10"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#001126]/10 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsEditingPreferences(false)}
                        disabled={isSavingPreferences}
                        className="btn-action-secondary px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePreferences}
                        disabled={isSavingPreferences}
                        className="btn-action-primary px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#74777d] dark:text-[#94a3b8] block">
                        Tone & Channel
                      </span>
                      <p className="font-medium text-[#001126] dark:text-[#f3f6fa] capitalize">
                        {selectedClientForDetails.preferredTone || 'Professional'} (Email)
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#74777d] dark:text-[#94a3b8] block">
                        Follow-up Status
                      </span>
                      <p className="font-medium">
                        {selectedClientForDetails.automatedRemindersEnabled !== false ? (
                          <span className="text-[#3d6562] dark:text-[#5eead4]">Active</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Paused</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#74777d] dark:text-[#94a3b8] block">
                        Send Window
                      </span>
                      <p className="font-mono text-[#001126] dark:text-[#f3f6fa]">
                        {selectedClientForDetails.communicationWindowStart || '09:00'} -{' '}
                        {selectedClientForDetails.communicationWindowEnd || '18:00'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#74777d] dark:text-[#94a3b8] block">
                        Timezone & Days
                      </span>
                      <p className="text-[#001126] dark:text-[#f3f6fa]">
                        {selectedClientForDetails.timezone || 'Asia/Kolkata'} ({formatDaysSummary(selectedClientForDetails.allowedDays)})
                      </p>
                    </div>
                    {selectedClientForDetails.communicationNotes && (
                      <div className="col-span-2 pt-1 border-t border-[#001126]/5 dark:border-white/5">
                        <span className="text-[10px] uppercase font-semibold text-[#74777d] dark:text-[#94a3b8] block">
                          Communication Note
                        </span>
                        <p className="text-[#44474d] dark:text-[#94a3b8] italic">
                          "{selectedClientForDetails.communicationNotes}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Other Details */}
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
                type="submit"
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
