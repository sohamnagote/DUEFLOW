import React, { useState, useRef } from 'react';
import { Invoice, Client, InvoiceStatus, UserProfile, InvoiceCsvRow, InvoiceImportResult } from '../types';
import { formatCurrency, getCurrencySymbol, SupportedCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/date';
import { dueflowApi } from '../utils/api';
import { InvoiceProcessingAnimation } from './animations/InvoiceProcessingAnimation';
import { ClientReplyReviewModal } from './ClientReplyReviewModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  clients?: Client[];
  userPreferredCurrency?: 'INR' | 'USD';
  userProfile?: UserProfile;
  onAddInvoice: (inv: Omit<Invoice, 'id'>) => Promise<any> | void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => Promise<any> | void;
  onDeleteInvoice: (id: string) => Promise<any> | void;
  onInvoiceImported?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  clients = [],
  userPreferredCurrency = 'INR',
  userProfile,
  onAddInvoice,
  onUpdateStatus,
  onDeleteInvoice,
  onInvoiceImported,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Client Reply Review Modal state
  const [replyReviewInvoice, setReplyReviewInvoice] = useState<Invoice | null>(null);

  // Full-screen processing overlay state
  const [processingOverlay, setProcessingOverlay] = useState<{
    isOpen: boolean;
    isSuccess: boolean;
    isError: boolean;
    errorMessage?: string;
  }>({ isOpen: false, isSuccess: false, isError: false });
  const submittingRef = React.useRef(false);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<Invoice | null>(null);


  // Search & Filter state
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modals State
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusReversalInvoice, setStatusReversalInvoice] = useState<Invoice | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // PDF download loading state per invoice
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // CSV Import State (Feature B)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<(InvoiceCsvRow & { isValid: boolean; error?: string })[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<InvoiceImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const parseCsvText = (text: string): string[][] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    return lines.map((line) => {
      const fields: string[] = [];
      let field = '';
      let inFieldQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inFieldQuotes && line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inFieldQuotes = !inFieldQuotes;
          }
        } else if (c === ',' && !inFieldQuotes) {
          fields.push(field.trim());
          field = '';
        } else {
          field += c;
        }
      }
      fields.push(field.trim());
      return fields;
    });
  };

  const handleDownloadCsvTemplate = () => {
    const headers = 'Invoice Number,Client Name,Client Email,Issue Date,Due Date,Amount,Currency,Description,Status\n';
    const sample1 = 'INV-2026-001,Acme Corporation,billing@acme.com,2026-10-01,2026-10-20,2500.00,USD,Consulting Services,UNPAID\n';
    const sample2 = 'INV-2026-002,Global Tech Solutions,finance@globaltech.io,2026-10-05,2026-10-25,48000.00,INR,Full Stack Engineering,UNPAID\n';
    const blob = new Blob(['\uFEFF' + headers + sample1 + sample2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dueflow-invoices-template.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          setImportError('The selected CSV file is empty.');
          setImportRows([]);
          return;
        }

        const rawLines = parseCsvText(text);
        if (rawLines.length < 2) {
          setImportError('CSV file must contain a header row and at least one data row.');
          setImportRows([]);
          return;
        }

        const headers = rawLines[0].map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));
        const invNumIdx = headers.findIndex((h) => h.includes('number') || h.includes('invoice'));
        const clientNameIdx = headers.findIndex((h) => (h.includes('client') && !h.includes('email')) || h.includes('name') || h.includes('customer'));
        const clientEmailIdx = headers.findIndex((h) => h.includes('email'));
        const issueDateIdx = headers.findIndex((h) => (h.includes('issue') || h.includes('date')) && !h.includes('due'));
        const dueDateIdx = headers.findIndex((h) => h.includes('due'));
        const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('price'));
        const currencyIdx = headers.findIndex((h) => h.includes('currency'));
        const descIdx = headers.findIndex((h) => h.includes('description') || h.includes('desc') || h.includes('notes') || h.includes('item'));
        const statusIdx = headers.findIndex((h) => h.includes('status'));

        const parsed: (InvoiceCsvRow & { isValid: boolean; error?: string })[] = [];

        for (let i = 1; i < rawLines.length; i++) {
          const row = rawLines[i];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue;

          const invNumber = invNumIdx !== -1 ? row[invNumIdx]?.trim() : undefined;
          const cName = clientNameIdx !== -1 ? row[clientNameIdx]?.trim() : '';
          const cEmail = clientEmailIdx !== -1 ? row[clientEmailIdx]?.trim() : '';
          const iDate = issueDateIdx !== -1 ? row[issueDateIdx]?.trim() : undefined;
          const dDate = dueDateIdx !== -1 ? row[dueDateIdx]?.trim() : undefined;
          const rawAmount = amountIdx !== -1 ? row[amountIdx]?.replace(/[^0-9.-]/g, '') : '0';
          const amt = parseFloat(rawAmount) || 0;
          const curr = currencyIdx !== -1 ? row[currencyIdx]?.trim().toUpperCase() : userPreferredCurrency;
          const desc = descIdx !== -1 ? row[descIdx]?.trim() : '';
          const st = statusIdx !== -1 ? row[statusIdx]?.trim().toUpperCase() : 'UNPAID';

          let isValid = true;
          let rowError = '';

          if (!cName) {
            isValid = false;
            rowError = 'Missing client name';
          } else if (amt <= 0 || isNaN(amt)) {
            isValid = false;
            rowError = 'Amount must be greater than 0';
          }

          parsed.push({
            invoiceNumber: invNumber,
            clientName: cName,
            clientEmail: cEmail,
            issueDate: iDate,
            dueDate: dDate,
            amount: amt,
            currency: curr === 'USD' ? 'USD' : 'INR',
            description: desc,
            status: st === 'PAID' ? 'PAID' : st === 'DRAFT' ? 'DRAFT' : 'UNPAID',
            isValid,
            error: rowError,
          });
        }

        setImportRows(parsed);
      } catch (err: any) {
        setImportError(err?.message || 'Failed to parse CSV file. Please check file format.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError('No valid rows available to import.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const payload: InvoiceCsvRow[] = validRows.map((r) => ({
        invoiceNumber: r.invoiceNumber,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        amount: r.amount,
        currency: r.currency,
        issueDate: r.issueDate,
        dueDate: r.dueDate,
        status: r.status,
        description: r.description,
      }));

      const res = await dueflowApi.importInvoicesCsv(payload);
      setImportSummary(res);

      if (onInvoiceImported) {
        onInvoiceImported();
      }
    } catch (err: any) {
      console.error('CSV import failed:', err);
      setImportError(err?.message || 'Failed to import invoices on server.');
    } finally {
      setIsImporting(false);
    }
  };

  const safeInvoices: Invoice[] = Array.isArray(invoices)
    ? (invoices.filter(Boolean) as Invoice[])
    : Array.isArray((invoices as any)?.invoices)
    ? (((invoices as any).invoices.filter(Boolean)) as Invoice[])
    : [];

  const safeClients: Client[] = Array.isArray(clients)
    ? (clients.filter(Boolean) as Client[])
    : Array.isArray((clients as any)?.clients)
    ? (((clients as any).clients.filter(Boolean)) as Client[])
    : [];

  // Filter & Search logic
  const filteredInvoices = safeInvoices.filter((inv) => {
    // 1. Status filter
    if (filterStatus === 'unpaid') {
      if (inv.status === 'paid') return false;
    } else if (filterStatus === 'overdue') {
      if (inv.status !== 'overdue') return false;
    } else if (filterStatus === 'paid') {
      if (inv.status !== 'paid') return false;
    }

    // 2. Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchNumber = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q);
    const matchClient = inv.clientName && inv.clientName.toLowerCase().includes(q);
    const matchDesc = inv.description && inv.description.toLowerCase().includes(q);
    return matchNumber || matchClient || matchDesc;
  });

  // New Invoice Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(userPreferredCurrency);
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Sync default currency and due date when opening modal
  const handleOpenNewModal = () => {
    setCurrency(userPreferredCurrency);
    setAmount('');
    setInvoiceNumber('');
    const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDueDate(defaultDue);
    setDescription('');
    setClientName('');
    setClientEmail('');
    setFormError(null);
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Prevent duplicate submissions
    if (submittingRef.current || isSubmitting) return;

    const trimmedName = clientName.trim();
    if (!trimmedName) {
      setFormError('Client name is required.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    const finalInvoiceNumber = invoiceNumber.trim() || undefined;
    const finalDueDate =
      dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const finalDescription = description.trim() || 'Services rendered';
    const matchedClient = safeClients.find(
      (c) => c && c.name && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    submittingRef.current = true;
    setIsSubmitting(true);
    // Show full-screen processing overlay
    setProcessingOverlay({ isOpen: true, isSuccess: false, isError: false });

    try {
      await onAddInvoice({
        invoiceNumber: finalInvoiceNumber || '',
        clientId: matchedClient ? matchedClient.id : undefined,
        clientName: trimmedName,
        clientEmail: clientEmail.trim() || (matchedClient ? matchedClient.email : `${trimmedName.toLowerCase().replace(/\s+/g, '')}@example.com`),
        amount: parsedAmount,
        currency,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: finalDueDate,
        status: 'pending',
        description: finalDescription,
        items: [
          {
            description: finalDescription,
            quantity: 1,
            rate: parsedAmount,
          },
        ],
        remindersSentCount: 0,
      });

      // Show success in the full-screen overlay
      setProcessingOverlay({ isOpen: true, isSuccess: true, isError: false });

      // Auto-close overlay and form after success
      setTimeout(() => {
        setProcessingOverlay({ isOpen: false, isSuccess: false, isError: false });
        setIsModalOpen(false);
        setClientName('');
        setClientEmail('');
        setAmount('');
        setInvoiceNumber('');
        setDueDate('');
        setDescription('');
        setFormError(null);
      }, 1800);
    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      const errorMsg = err?.message || 'Could not save invoice to database. Please check required fields.';
      setFormError(errorMsg);
      // Show error in the full-screen overlay — keep form data for retry
      setProcessingOverlay({ isOpen: true, isSuccess: false, isError: true, errorMessage: errorMsg });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleProcessingRetry = () => {
    setProcessingOverlay({ isOpen: false, isSuccess: false, isError: false });
    // Form data is preserved — user can re-submit
  };

  const handleProcessingClose = () => {
    setProcessingOverlay({ isOpen: false, isSuccess: false, isError: false });
  };

  const handleDownloadPdf = async (inv: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingPdfId(inv.id);
    setPdfError(null);
    try {
      await dueflowApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
    } catch (err: any) {
      console.error('Failed to download invoice PDF:', err);
      setPdfError(err?.message || 'Could not download invoice PDF. Please try again.');
      setTimeout(() => setPdfError(null), 5000);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteInvoice(invoiceToDelete.id);
      if (selectedInvoiceForDetails?.id === invoiceToDelete.id) {
        setSelectedInvoiceForDetails(null);
      }
      setInvoiceToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChangeClick = (inv: Invoice, targetStatus: InvoiceStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (inv.status === 'paid' && targetStatus === 'pending') {
      // Reversing paid status requires confirmation
      setStatusReversalInvoice(inv);
    } else {
      executeStatusUpdate(inv.id, targetStatus);
    }
  };

  const executeStatusUpdate = async (id: string, status: InvoiceStatus) => {
    setIsUpdatingStatus(id);
    try {
      await onUpdateStatus(id, status);
      if (selectedInvoiceForDetails && selectedInvoiceForDetails.id === id) {
        setSelectedInvoiceForDetails((prev) => (prev ? { ...prev, status } : null));
      }
      setStatusReversalInvoice(null);
    } catch (err: any) {
      console.error('Status update failed:', err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d] text-[#1b1c19] dark:text-[#f3f6fa] px-6 sm:px-14 py-8">
      {/* Ambient background bloom */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[480px] h-[480px] bg-[#bfebe6]/40 dark:bg-teal-500/10 rounded-full blur-[100px] pointer-events-none opacity-60 dark:opacity-30" />
        <div className="absolute top-1/2 left-1/3 w-[360px] h-[360px] bg-[#eae8e3]/60 dark:bg-blue-500/10 rounded-full blur-[80px] pointer-events-none opacity-40 dark:opacity-20" />

        {/* Header Section */}
        <section className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-8">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <h1 className="text-3xl sm:text-[38px] leading-[44px] font-bold text-[#15263c] dark:text-[#f3f6fa] tracking-tight">
              Invoices
            </h1>
            <p className="text-sm text-[#44474d] dark:text-[#94a3b8] font-normal">
              Create, search, and track invoices in their authentic currencies.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setImportError(null);
                setImportSummary(null);
                setImportRows([]);
                setCsvFileName(null);
                setIsImportModalOpen(true);
              }}
              className="btn-action-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                upload_file
              </span>
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleOpenNewModal}
              className="btn-action-primary group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#fbf9f4] dark:text-[#001126] transition-transform duration-200 group-hover:rotate-90">
                add
              </span>
              <span>New invoice</span>
            </button>
          </div>
        </section>

        {/* Feedback notice for PDF errors */}
        {pdfError && (
          <div className="relative z-10 mb-4 p-3 bg-[#ba1a1a]/10 dark:bg-red-950/40 border border-[#ba1a1a]/20 dark:border-red-500/20 rounded-xl text-xs text-[#ba1a1a] dark:text-[#f87171] font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{pdfError}</span>
            </div>
            <button onClick={() => setPdfError(null)} className="text-[#ba1a1a] dark:text-[#f87171] hover:opacity-75 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Content: Empty State vs Invoices List */}
        {safeInvoices.length === 0 ? (
          <section className="relative z-10 w-full min-h-[520px] flex items-center justify-center py-16 px-4">
            <div className="w-full max-w-2xl bg-[#ffffff]/80 dark:bg-[#141f2e]/90 backdrop-blur-md rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center shadow-xs border border-[#15263c]/5 dark:border-white/10">
              <div className="relative mb-6 flex items-center justify-center">
                <div className="relative w-24 h-30 rounded-xl bg-[#f5f3ee]/80 dark:bg-white/10 flex flex-col items-center justify-center shadow-inner">
                  <svg
                    className="w-14 h-18 text-[#15263c] dark:text-[#f3f6fa]"
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
                    <circle className="fill-[#3d6562] dark:fill-[#5eead4]" cx="43" cy="58" r="2.75" />
                  </svg>
                </div>
              </div>

              <h2 className="text-[26px] leading-[32px] font-bold text-[#15263c] dark:text-[#f3f6fa] tracking-tight mb-2">
                No invoices yet.
              </h2>
              <p className="text-sm text-[#44474d] dark:text-[#94a3b8] max-w-md mb-8 leading-relaxed">
                Create your first invoice in your preferred currency ({userPreferredCurrency === 'INR' ? 'INR ₹' : 'USD $'}) to start tracking client payments and automated reminders.
              </p>

              <button
                onClick={handleOpenNewModal}
                className="btn-action-primary group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold shadow-md cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-[#fbf9f4] dark:text-[#001126]">
                  receipt_long
                </span>
                <span>Create your first invoice</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="relative z-10 w-full space-y-4">
            {/* Filter and Search Bar Controls */}
            <div className="bg-[#ffffff]/90 dark:bg-[#141f2e]/95 backdrop-blur-md rounded-2xl border border-[#15263c]/10 dark:border-white/10 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(
                  [
                    { id: 'all', label: 'All', count: safeInvoices.length },
                    {
                      id: 'unpaid',
                      label: 'Unpaid',
                      count: safeInvoices.filter((i) => i.status !== 'paid').length,
                    },
                    {
                      id: 'overdue',
                      label: 'Overdue',
                      count: safeInvoices.filter((i) => i.status === 'overdue').length,
                    },
                    {
                      id: 'paid',
                      label: 'Paid',
                      count: safeInvoices.filter((i) => i.status === 'paid').length,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = filterStatus === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                        isActive
                          ? 'bg-[#15263c] dark:bg-white text-[#ffffff] dark:text-[#001126] shadow-xs'
                          : 'bg-[#f5f3ee] dark:bg-[#192638] text-[#44474d] dark:text-[#94a3b8] hover:bg-[#15263c]/10 dark:hover:bg-white/10 hover:text-[#15263c] dark:hover:text-[#f3f6fa]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-['Space_Mono'] px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-[#ffffff]/20 dark:bg-[#001126]/20 text-[#ffffff] dark:text-[#001126]'
                            : 'bg-[#15263c]/8 dark:bg-white/10 text-[#44474d] dark:text-[#94a3b8]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoice #, client, description..."
                  className="w-full px-3.5 py-2 pl-9 bg-[#fbf9f4] dark:bg-[#0c131d] text-xs rounded-xl border border-[#15263c]/15 dark:border-white/10 focus:outline-none focus:border-[#15263c] dark:focus:border-white/30 text-[#15263c] dark:text-[#f3f6fa] placeholder-[#74777d] dark:placeholder-[#64748b]"
                />
                <span className="material-symbols-outlined text-[18px] text-[#74777d] dark:text-[#94a3b8] absolute left-2.5 top-2 pointer-events-none">
                  search
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-[#74777d] dark:text-[#94a3b8] hover:text-[#15263c] dark:hover:text-[#f3f6fa] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Invoices List / Table */}
            {filteredInvoices.length === 0 ? (
              <div className="bg-[#ffffff]/80 dark:bg-[#141f2e]/90 rounded-2xl border border-[#15263c]/10 dark:border-white/10 p-12 text-center space-y-3">
                <span className="material-symbols-outlined text-[32px] text-[#74777d] dark:text-[#94a3b8]">
                  filter_list_off
                </span>
                <h3 className="text-base font-bold text-[#15263c] dark:text-[#f3f6fa]">No matching invoices</h3>
                <p className="text-xs text-[#44474d] dark:text-[#94a3b8] max-w-sm mx-auto">
                  No invoices match your current filter ({filterStatus}) and search query ("{searchQuery}").
                </p>
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setSearchQuery('');
                  }}
                  className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg mt-2 inline-block cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="bg-[#ffffff]/95 dark:bg-[#141f2e] rounded-2xl border border-[#15263c]/10 dark:border-white/10 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-[#15263c]/10 dark:border-white/10 bg-[#f5f3ee] dark:bg-[#0f1724] text-[#44474d] dark:text-[#94a3b8] font-['Space_Mono'] text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#15263c]/8 dark:divide-white/10">
                      {filteredInvoices.map((inv) => {
                        const isDownloadingThis = downloadingPdfId === inv.id;
                        const isStatusUpdatingThis = isUpdatingStatus === inv.id;

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-[#fbf9f4] dark:hover:bg-white/5 transition-colors cursor-pointer group"
                            onClick={() => setSelectedInvoiceForDetails(inv)}
                          >
                            <td className="py-3.5 px-4 font-['Space_Mono'] text-xs font-semibold text-[#15263c] dark:text-[#93c5fd]">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#15263c] dark:text-[#f3f6fa]">
                              <div>{inv.clientName}</div>
                              {inv.clientEmail && (
                                <div className="text-[11px] text-[#74777d] dark:text-[#94a3b8] font-normal truncate max-w-[180px]">
                                  {inv.clientEmail}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[#44474d] dark:text-[#94a3b8] text-xs truncate max-w-xs">
                              {inv.description}
                            </td>
                            <td className="py-3.5 px-4 font-['Space_Mono'] text-xs text-[#44474d] dark:text-[#94a3b8]">
                              {formatDisplayDate(inv.dueDate)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-[#15263c] dark:text-[#f3f6fa]">
                              {formatCurrency(inv.amount, inv.currency)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`font-['Space_Mono'] text-[9px] uppercase px-2.5 py-0.5 rounded-full font-semibold ${
                                    inv.status === 'paid'
                                      ? 'bg-[#bfebe6] dark:bg-teal-950/60 text-[#00201e] dark:text-[#5eead4]'
                                      : inv.status === 'overdue'
                                      ? 'bg-[#ffdad6] dark:bg-red-950/60 text-[#ba1a1a] dark:text-[#f87171]'
                                      : 'bg-[#15263c]/8 dark:bg-blue-950/60 text-[#15263c] dark:text-[#93c5fd]'
                                  }`}
                                >
                                  {inv.status === 'pending' ? 'Unpaid' : inv.status}
                                </span>
                                {(inv.followUpStatus === 'PAUSED_FOR_REVIEW' || inv.follow_up_status === 'PAUSED_FOR_REVIEW' || inv.lastReplyClassification || inv.last_reply_classification) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyReviewInvoice(inv);
                                    }}
                                    className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-200 transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Client replied — click to review"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                    {inv.lastReplyClassification === 'PAYMENT_REPORTED'
                                      ? 'Paid Reported'
                                      : inv.lastReplyClassification === 'NEED_MORE_TIME'
                                      ? 'Time Requested'
                                      : inv.lastReplyClassification === 'CORRECTION_REQUESTED'
                                      ? 'Correction'
                                      : inv.lastReplyClassification === 'QUESTION'
                                      ? 'Question'
                                      : 'Client Replied'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Review Reply button if client has responded */}
                                {(inv.followUpStatus === 'PAUSED_FOR_REVIEW' || inv.follow_up_status === 'PAUSED_FOR_REVIEW' || inv.lastReplySnippet || inv.last_reply_snippet) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyReviewInvoice(inv);
                                    }}
                                    className="px-2.5 py-1 bg-cyan-600/10 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-600/20 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1"
                                    title="Review Client Reply"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">forum</span>
                                    <span>Reply</span>
                                  </button>
                                )}

                                {/* View button */}
                                <button
                                  onClick={() => setSelectedInvoiceForDetails(inv)}
                                  className="px-2.5 py-1 text-xs text-[#15263c] dark:text-[#f3f6fa] hover:bg-[#15263c]/10 dark:hover:bg-white/10 rounded-lg border border-[#15263c]/15 dark:border-white/10 font-medium transition-all active:scale-[0.97] cursor-pointer"
                                  title="View Invoice Details"
                                >
                                  View
                                </button>


                                {/* Authenticated Download PDF button */}
                                <button
                                  onClick={(e) => handleDownloadPdf(inv, e)}
                                  disabled={isDownloadingThis}
                                  className="p-1 text-[#15263c] dark:text-[#f3f6fa] hover:bg-[#15263c]/10 dark:hover:bg-white/10 rounded-lg border border-[#15263c]/15 dark:border-white/10 transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                                  title="Download PDF"
                                >
                                  <span className="material-symbols-outlined text-[16px] block">
                                    {isDownloadingThis ? 'progress_activity' : 'download'}
                                  </span>
                                </button>

                                {/* Status Toggle button */}
                                {inv.status !== 'paid' ? (
                                  <button
                                    onClick={(e) => handleStatusChangeClick(inv, 'paid', e)}
                                    disabled={isStatusUpdatingThis}
                                    className="px-2.5 py-1 bg-[#3d6562]/10 dark:bg-teal-950/50 text-[#3d6562] dark:text-[#5eead4] hover:bg-[#3d6562]/20 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] cursor-pointer"
                                    title="Mark invoice as paid"
                                  >
                                    Mark paid
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => handleStatusChangeClick(inv, 'pending', e)}
                                    disabled={isStatusUpdatingThis}
                                    className="px-2.5 py-1 bg-[#001126]/8 dark:bg-white/10 text-[#001126] dark:text-[#93c5fd] hover:bg-[#001126]/15 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] cursor-pointer"
                                    title="Reopen invoice as unpaid"
                                  >
                                    Reopen
                                  </button>
                                )}

                                {/* Delete invoice button */}
                                <button
                                  onClick={() => setInvoiceToDelete(inv)}
                                  className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#ba1a1a] dark:hover:text-[#f87171] hover:bg-[#ba1a1a]/10 p-1 rounded-lg transition-all active:scale-[0.95] cursor-pointer"
                                  title="Delete invoice"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Delete Invoice */}
      {invoiceToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setInvoiceToDelete(null)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#15263c]/15 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#ba1a1a] dark:text-[#f87171]">
              <div className="p-2.5 rounded-full bg-[#ba1a1a]/10 dark:bg-red-950/50">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#15263c] dark:text-[#f3f6fa]">Delete Invoice</h3>
                <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
              Are you sure you want to permanently delete invoice{' '}
              <strong className="text-[#15263c] dark:text-[#f3f6fa]">{invoiceToDelete.invoiceNumber}</strong> for{' '}
              <strong className="text-[#15263c] dark:text-[#f3f6fa]">{invoiceToDelete.clientName}</strong> ({formatCurrency(invoiceToDelete.amount, invoiceToDelete.currency)})?
            </p>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-[#15263c]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeleting}
                className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="btn-action-danger px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Status Reversal (Paid -> Pending) */}
      {statusReversalInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => statusReversalInvoice && setStatusReversalInvoice(null)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#15263c]/15 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#15263c] dark:text-[#60a5fa]">
              <div className="p-2.5 rounded-full bg-[#15263c]/10 dark:bg-blue-950/50">
                <span className="material-symbols-outlined text-[24px]">history</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#15263c] dark:text-[#f3f6fa]">Reopen Invoice</h3>
                <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Reverse payment confirmation</p>
              </div>
            </div>

            <p className="text-xs text-[#44474d] dark:text-[#94a3b8] leading-relaxed">
              Do you want to change invoice{' '}
              <strong className="text-[#15263c] dark:text-[#f3f6fa]">{statusReversalInvoice.invoiceNumber}</strong> back to{' '}
              <span className="font-semibold text-[#ba1a1a] dark:text-[#f87171]">Unpaid</span>? This will make it eligible for reminder scheduling again.
            </p>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-[#15263c]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setStatusReversalInvoice(null)}
                className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Keep as Paid
              </button>
              <button
                type="button"
                onClick={() => executeStatusUpdate(statusReversalInvoice.id, 'pending')}
                className="btn-action-primary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Reopen as Unpaid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#15263c]/15 dark:border-white/10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#15263c]/10 dark:border-white/10">
              <h3 className="text-xl font-bold text-[#15263c] dark:text-[#f3f6fa]">New Invoice</h3>
              {!isSubmitting && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            {/* When submitting, show a brief inline loading indicator */}
            {isSubmitting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#15263c]/20 dark:border-white/20 border-t-[#15263c] dark:border-t-white rounded-full animate-spin" />
                <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Saving invoice…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-[#ba1a1a]/10 dark:bg-red-950/40 border border-[#ba1a1a]/20 dark:border-red-500/20 text-[#ba1a1a] dark:text-[#f87171] text-xs font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    list="client-suggestions"
                    value={clientName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientName(val);
                      const matched = safeClients.find((c) => c && c.name && c.name.toLowerCase() === val.trim().toLowerCase());
                      if (matched && matched.email) {
                        setClientEmail(matched.email);
                      }
                    }}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#15263c]/15 dark:border-white/10 focus:outline-none focus:border-[#15263c] dark:focus:border-white/30"
                    required
                  />
                  <datalist id="client-suggestions">
                    {safeClients.filter((c) => c && c.name).map((c) => (
                      <option key={c.id} value={c.name}>{c.email}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="e.g. billing@acme.com"
                    className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#15263c]/15 dark:border-white/10 focus:outline-none focus:border-[#15263c] dark:focus:border-white/30"
                  />
                </div>

                {/* Currency & Amount Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                      Currency *
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                      className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-sm font-semibold text-[#001126] dark:text-[#f3f6fa] rounded-lg border border-[#15263c]/15 dark:border-white/10 focus:outline-none focus:border-[#15263c] cursor-pointer"
                    >
                      <option value="INR">Indian Rupee (INR ₹)</option>
                      <option value="USD">US Dollar (USD $)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                      Amount ({getCurrencySymbol(currency)}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm font-semibold rounded-lg border border-[#15263c]/15 dark:border-white/10 focus:outline-none focus:border-[#15263c] dark:focus:border-white/30"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                      Invoice # <span className="text-[10px] text-[#74777d] dark:text-[#94a3b8] lowercase font-normal">(optional - auto-generated if blank)</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Auto-generated (e.g. INV-2026-001)"
                      className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#15263c]/15 dark:border-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#15263c]/15 dark:border-white/10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8] mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-[#fbf9f4] dark:bg-[#0c131d] text-[#15263c] dark:text-[#f3f6fa] text-sm rounded-lg border border-[#15263c]/15 dark:border-white/10 resize-y"
                  />
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 border-t border-[#15263c]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="btn-action-secondary w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-action-primary w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Create Invoice</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Invoice Details & PDF View Modal */}
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
                  {selectedInvoiceForDetails.status === 'pending' ? 'Unpaid' : selectedInvoiceForDetails.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedInvoiceForDetails)}
                  disabled={downloadingPdfId === selectedInvoiceForDetails.id}
                  className="btn-action-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  title="Download authenticated invoice PDF"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {downloadingPdfId === selectedInvoiceForDetails.id ? 'progress_activity' : 'download'}
                  </span>
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="btn-action-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForDetails(null)}
                  className="text-[#74777d] hover:text-[#001126] hover:bg-[#15263c]/5 p-1 rounded-lg transition-colors active:scale-95 cursor-pointer"
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
                  <p className="text-[#44474d]">Issue Date: {formatDisplayDate(selectedInvoiceForDetails.issueDate)}</p>
                  <p className="text-[#ba1a1a] font-semibold">Due Date: {formatDisplayDate(selectedInvoiceForDetails.dueDate)}</p>
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

      {/* CSV Invoice Import Modal (Feature B) */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !isImporting && setIsImportModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] rounded-2xl max-w-3xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#15263c]/15 dark:border-white/10 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#15263c]/10 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#3d6562]/10 dark:bg-[#68b5ad]/20 text-[#3d6562] dark:text-[#68b5ad]">
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#15263c] dark:text-[#f3f6fa]">Import Invoices from CSV</h3>
                  <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">Upload your client billing spreadsheet to bulk create or update invoices.</p>
                </div>
              </div>
              {!isImporting && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            {/* Template & Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f0eee9]/40 dark:bg-[#101926] border border-[#15263c]/10 dark:border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#15263c] dark:text-[#f3f6fa]">1. Download standard template</h4>
                  <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-1">
                    Use our pre-formatted spreadsheet template with the required columns for invoices, clients, dates, and amounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="btn-action-secondary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg self-start cursor-pointer mt-2"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download template (.csv)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#f0eee9]/40 dark:bg-[#101926] border border-[#15263c]/10 dark:border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#15263c] dark:text-[#f3f6fa]">2. Select your CSV file</h4>
                  <p className="text-xs text-[#44474d] dark:text-[#94a3b8] mt-1">
                    Upload your UTF-8 CSV file. Quotation marks and commas inside descriptions are handled automatically.
                  </p>
                </div>
                <input
                  type="file"
                  ref={csvFileInputRef}
                  onChange={handleCsvFileUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvFileInputRef.current?.click()}
                  className="btn-action-primary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg self-start cursor-pointer mt-2"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  <span>{csvFileName ? `Change file (${csvFileName})` : 'Choose CSV file...'}</span>
                </button>
              </div>
            </div>

            {/* Deduplication Note */}
            <div className="p-3 bg-[#f0eee9]/50 dark:bg-[#101926] rounded-lg border border-[#15263c]/5 dark:border-white/10 text-xs text-[#44474d] dark:text-[#94a3b8] flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#3d6562] dark:text-[#68b5ad] shrink-0 mt-0.5">verified_user</span>
              <span>
                <strong>Safe deduplication:</strong> Existing invoice numbers within your workspace will be updated with confirmed CSV figures without wiping reminder records. New invoice numbers will auto-link or provision client records.
              </span>
            </div>

            {/* Import Feedback / Error */}
            {importError && (
              <div className="p-3 rounded-lg bg-[#ffdad6]/40 dark:bg-red-950/40 border border-[#ba1a1a]/20 text-xs text-[#ba1a1a] dark:text-[#f87171] flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{importError}</span>
              </div>
            )}

            {/* Success Summary */}
            {importSummary && (
              <div className="p-4 rounded-xl bg-[#bfebe6]/40 dark:bg-teal-950/40 border border-[#3d6562]/30 text-xs text-[#00201e] dark:text-[#9ec9c4] space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px] text-[#3d6562] dark:text-[#68b5ad]">check_circle</span>
                  <span>Import Completed: {importSummary.importedCount} {importSummary.importedCount === 1 ? 'invoice' : 'invoices'} successfully saved.</span>
                </div>
                {importSummary.failedCount > 0 && (
                  <p className="text-xs text-[#ba1a1a] dark:text-[#f87171]">
                    {importSummary.failedCount} rows could not be imported. Please review the reported errors below:
                  </p>
                )}
                {importSummary.errors && importSummary.errors.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {importSummary.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Preview Table */}
            {importRows.length > 0 && !importSummary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#15263c] dark:text-[#f3f6fa]">
                    Preview parsed rows ({importRows.length} total)
                  </span>
                  <span className="text-[#3d6562] dark:text-[#68b5ad] font-semibold">
                    {importRows.filter((r) => r.isValid).length} valid rows ready to import
                  </span>
                </div>

                <div className="border border-[#15263c]/10 dark:border-white/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f5f3ee] dark:bg-[#0f1724] border-b border-[#15263c]/10 dark:border-white/10 text-[#44474d] dark:text-[#94a3b8]">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Client</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#15263c]/5 dark:divide-white/5">
                      {importRows.map((r, idx) => (
                        <tr key={idx} className={r.isValid ? 'hover:bg-[#fbf9f4] dark:hover:bg-white/5' : 'bg-red-50/50 dark:bg-red-950/20'}>
                          <td className="p-2.5 font-mono text-[11px] text-[#15263c] dark:text-[#93c5fd]">
                            {r.invoiceNumber || 'Auto'}
                          </td>
                          <td className="p-2.5 font-medium">
                            <div>{r.clientName || '—'}</div>
                            {r.clientEmail && <div className="text-[10px] text-[#74777d]">{r.clientEmail}</div>}
                          </td>
                          <td className="p-2.5 text-[#44474d] dark:text-[#94a3b8]">
                            {r.dueDate || 'Default (14d)'}
                          </td>
                          <td className="p-2.5 text-right font-semibold tabular-nums">
                            {r.currency} {r.amount ? r.amount.toFixed(2) : '0.00'}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#15263c]/10 dark:bg-white/10">
                              {r.status || 'UNPAID'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#3d6562] dark:text-[#68b5ad] font-semibold">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#15263c]/10 dark:border-white/10">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setIsImportModalOpen(false)}
                className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {importSummary ? 'Close' : 'Cancel'}
              </button>

              {!importSummary && (
                <button
                  type="button"
                  disabled={isImporting || importRows.filter((r) => r.isValid).length === 0}
                  onClick={handleConfirmImport}
                  className="btn-action-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isImporting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Importing invoices...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Confirm & Import ({importRows.filter((r) => r.isValid).length} invoices)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen invoice processing overlay */}
      <InvoiceProcessingAnimation
        isOpen={processingOverlay.isOpen}
        isSuccess={processingOverlay.isSuccess}
        isError={processingOverlay.isError}
        errorMessage={processingOverlay.errorMessage}
        invoiceNumber={invoiceNumber || 'INV-DRAFT'}
        clientName={clientName}
        amount={amount ? `${getCurrencySymbol(currency)} ${amount}` : undefined}
        onRetry={handleProcessingRetry}
        onClose={handleProcessingClose}
      />

      {/* Client Reply Review Modal */}
      <ClientReplyReviewModal
        isOpen={!!replyReviewInvoice}
        invoice={replyReviewInvoice}
        onClose={() => setReplyReviewInvoice(null)}
        onInvoiceUpdated={(updated) => {
          if (onInvoiceImported) {
            onInvoiceImported();
          }
          setReplyReviewInvoice(updated);
        }}
        onMarkPaid={(id) => {
          onUpdateStatus(id, 'paid');
        }}
      />
    </div>
  );
};

