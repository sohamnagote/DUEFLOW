import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Mail, Building, FileText, Check } from 'lucide-react';
import { Client, Invoice, ToneTemplate } from '../types';
import { generateCadenceRules } from '../utils/reminderEngine';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  clients: Client[];
  initialInvoice?: Invoice | null;
  defaultTone?: ToneTemplate;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  initialInvoice,
  defaultTone = 'Gentle Creative Professional',
}) => {
  const isEditing = Boolean(initialInvoice);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCin, setClientCin] = useState('');
  const [clientAttn, setClientAttn] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('scheduled');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [toneTemplate, setToneTemplate] = useState<ToneTemplate>(defaultTone);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialInvoice) {
      setInvoiceNumber(initialInvoice.invoice_number);
      setClientName(initialInvoice.client_name);
      setClientEmail(initialInvoice.client_email);
      setClientPhone(initialInvoice.client_phone || '');
      setClientCin(initialInvoice.client_cin || '');
      setClientAttn(initialInvoice.client_attn || '');
      setAmount(initialInvoice.amount.toString());
      setIssueDate(initialInvoice.issue_date);
      setDueDate(initialInvoice.due_date);
      setStatus(initialInvoice.status);
      setRemindersEnabled(initialInvoice.reminders_enabled);
      setToneTemplate(initialInvoice.tone_template);
      setNotes(initialInvoice.notes || '');
    } else {
      setInvoiceNumber('');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientCin('');
      setClientAttn('');
      setAmount('');
      const today = new Date().toISOString().split('T')[0];
      setIssueDate(today);
      const due = new Date();
      due.setDate(due.getDate() + 14);
      setDueDate(due.toISOString().split('T')[0]);
      setStatus('due_soon');
      setRemindersEnabled(true);
      setToneTemplate(defaultTone);
      setNotes('');
    }
  }, [initialInvoice, isOpen, clients, defaultTone]);

  if (!isOpen) return null;

  const handleClientSelect = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    if (selected) {
      setClientName(selected.name);
      setClientEmail(selected.email);
      setClientPhone(selected.phone || '');
      setClientCin(selected.cin || '');
      setClientAttn(selected.attn || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!clientEmail.includes('@') || !clientEmail.includes('.')) {
      setErrorMsg('Please enter a valid client email address.');
      return;
    }

    const payload: Partial<Invoice> = {
      ...(initialInvoice || {}),
      invoice_number: invoiceNumber.trim().toUpperCase(),
      client_name: clientName.trim(),
      client_email: clientEmail.trim().toLowerCase(),
      client_phone: clientPhone.trim() || undefined,
      client_cin: clientCin.trim() || undefined,
      client_attn: clientAttn.trim() || undefined,
      amount: numericAmount,
      currency: 'INR',
      issue_date: issueDate,
      due_date: dueDate,
      status: status,
      reminders_enabled: remindersEnabled,
      tone_template: toneTemplate,
      cadence_architecture: 'Active · 4-Stage Automated Reminders',
      notes: notes.trim(),
    };

    if (!isEditing) {
      payload.id = `inv-${Date.now()}`;
      payload.user_id = 'usr-001';
      payload.created_at = new Date().toISOString();
      payload.rules = generateCadenceRules(
        payload.id,
        payload.invoice_number!,
        payload.due_date!,
        toneTemplate
      );
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#e3e1ea] max-h-[92vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#e3e1ea]">
          <div>
            <span className="font-label-caps text-[10px] uppercase text-[#747878] font-bold tracking-wider">
              {isEditing ? 'UPDATE EXISTING INVOICE' : 'PORTAL ENTRY // NEW INVOICE'}
            </span>
            <h2 className="text-xl font-bold text-[#1a1b22] tracking-tight">
              {isEditing ? `Edit ${initialInvoice?.invoice_number}` : 'Create New Invoice'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close invoice dialog"
            className="w-10 h-10 flex items-center justify-center text-[#747878] hover:text-[#1a1b22] rounded-lg hover:bg-[#f4f2fc] transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-[#ffdad6]/60 border border-[#ffdad6] text-[#ba1a1a] rounded text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold">
                CLIENT / AGENCY *
              </label>
              <select
                onChange={(e) => handleClientSelect(e.target.value)}
                className="text-[11px] text-[#5b598b] underline bg-transparent border-0 cursor-pointer"
              >
                <option value="">Choose saved client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Studio Archaea"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
            />
          </div>

          {/* Email, Attn & WhatsApp Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                FINANCE EMAIL *
              </label>
              <input
                type="email"
                required
                placeholder="finance@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                ATTN / CONTACT
              </label>
              <input
                type="text"
                placeholder="Attn: Accounts Desk"
                value={clientAttn}
                onChange={(e) => setClientAttn(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22]"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#059669] font-bold block mb-1">
                WHATSAPP MOBILE
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#059669] text-sm text-[#1a1b22] font-mono"
              />
            </div>
          </div>

          {/* Invoice Number & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                INVOICE NUMBER *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. #INV-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22] font-semibold"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                TOTAL AMOUNT (INR ₹) *
              </label>
              <input
                type="number"
                required
                step="1"
                min="1"
                placeholder="25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-sm text-[#1a1b22] font-bold tabular-nums"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                ISSUE DATE *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-xs text-[#1a1b22]"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                DUE DATE *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-xs text-[#1a1b22]"
              />
            </div>
          </div>

          {/* Cadence Tone & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                TONE TEMPLATE
              </label>
              <select
                value={toneTemplate}
                onChange={(e) => setToneTemplate(e.target.value as ToneTemplate)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-xs text-[#1a1b22]"
              >
                <option value="Gentle Creative Professional">Gentle Creative Professional</option>
                <option value="Casual Friendly">Casual Friendly</option>
                <option value="Firm & Direct">Firm & Direct</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
                INITIAL STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-xs text-[#1a1b22]"
              >
                <option value="due_soon">Due Soon</option>
                <option value="scheduled">Scheduled</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Reminders Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="reminders_toggle"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
              className="w-4 h-4 accent-black rounded cursor-pointer"
            />
            <label htmlFor="reminders_toggle" className="text-xs text-[#1a1b22] font-semibold cursor-pointer">
              Enable automated 4-stage reminder schedule (-3d, 0d, +3d, +7d)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="font-label-caps text-[10px] uppercase text-[#747878] font-bold block mb-1">
              INVOICE &amp; PAYMENT NOTES
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliverable Phase 1. Bank transfer via HDFC or UPI."
              className="w-full px-3 py-2 bg-white border border-[#e3e1ea] rounded-md focus:outline-none focus:border-[#5b598b] text-xs text-[#1a1b22]"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[#e3e1ea]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] sm:min-h-0 text-xs font-semibold text-[#747878] hover:text-[#1a1b22] text-center cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-black hover:bg-[#1c1b1b] text-white px-5 py-3 min-h-[44px] rounded-lg font-label-caps text-[11px] uppercase tracking-wider font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98] text-center"
            >
              {isEditing ? 'UPDATE INVOICE' : 'SAVE & ACTIVATE REMINDERS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
