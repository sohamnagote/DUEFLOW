export type OperationalStatus = 'unpaid' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';

export interface InvoiceStatusInput {
  status: string;
  due_date: string;
  paid_at?: string | null;
  reminders_enabled?: boolean;
}

/**
 * Centralized invoice status service.
 * Derives the operational status based on stored state and due date relative to today.
 * Paid status is strictly user-controlled and never inferred from email activity.
 */
export function deriveOperationalStatus(invoice: InvoiceStatusInput, referenceDate: Date = new Date()): OperationalStatus {
  // If explicitly marked paid
  if (invoice.status === 'paid' || invoice.paid_at) {
    return 'paid';
  }

  // If explicitly cancelled
  if (invoice.status === 'cancelled') {
    return 'cancelled';
  }

  // Parse due date in YYYY-MM-DD
  const [dueY, dueM, dueD] = invoice.due_date.split('-').map(Number);
  const dueUtc = Date.UTC(dueY, dueM - 1, dueD);
  const refUtc = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());

  const diffDays = Math.round((dueUtc - refUtc) / (1000 * 60 * 60 * 24));

  // Overdue: past due date
  if (diffDays < 0) {
    return 'overdue';
  }

  // Due Soon: within 3 days before or on due date (0, 1, 2, 3 days away)
  if (diffDays <= 3) {
    return 'due_soon';
  }

  // Otherwise unpaid future invoice
  return 'unpaid';
}

/**
 * Checks whether reminders should actively execute for this invoice.
 */
export function areRemindersExecutable(invoice: InvoiceStatusInput): boolean {
  if (invoice.reminders_enabled === false) return false;
  if (invoice.status === 'paid' || invoice.paid_at) return false;
  if (invoice.status === 'cancelled') return false;
  return true;
}
