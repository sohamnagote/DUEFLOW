import { Invoice, UserProfile } from '../types';
import { formatINR } from './reminderEngine';

export type ReminderTone = 'gentle' | 'professional' | 'firm';

/**
 * Generates formatted, personalized WhatsApp reminder messages for an invoice.
 */
export function generateWhatsAppReminderMessage(
  invoice: Invoice,
  user: UserProfile,
  tone: ReminderTone = 'professional'
): string {
  const amountStr = formatINR(invoice.amount);
  const upiId = user.upi_id || 'Available on request';
  const businessName = user.business_name || user.full_name || 'Accounts';
  const senderName = user.full_name || 'Finance Desk';

  if (tone === 'gentle') {
    return (
      `Hi ${invoice.client_name}, hope you are doing well!\n\n` +
      `Just a gentle advance reminder regarding invoice *${invoice.invoice_number}* for *${amountStr}*, due on *${invoice.due_date}*.\n\n` +
      `*Payment Details:*\n` +
      `• UPI ID: ${upiId}\n` +
      (user.bank_account_no ? `• Account: ${user.bank_account_no}\n` : '') +
      (user.bank_ifsc ? `• IFSC: ${user.bank_ifsc}\n` : '') +
      `• Beneficiary: ${businessName}\n\n` +
      `Kindly let us know once settled. Thank you!\n` +
      `— ${senderName}`
    );
  }

  if (tone === 'firm') {
    return (
      `*URGENT: PAYMENT REQUIRED*\n\n` +
      `Dear ${invoice.client_name},\n\n` +
      `This is a payment reminder for invoice *${invoice.invoice_number}* for *${amountStr}*. Payment was due on *${invoice.due_date}* and is now overdue.\n\n` +
      `*Payment Details:*\n` +
      `• UPI ID: ${upiId}\n` +
      (user.bank_account_no ? `• Bank Account: ${user.bank_account_no}\n` : '') +
      (user.bank_ifsc ? `• IFSC: ${user.bank_ifsc}\n` : '') +
      `• Beneficiary: ${businessName}\n\n` +
      `Please make the payment today and share the payment confirmation or reference number.\n\n` +
      `Thank you,\n` +
      `${businessName} Accounts Team`
    );
  }

  // Default: Professional
  return (
    `Hello ${invoice.client_name},\n\n` +
    `This is a payment reminder from ${businessName} for invoice *${invoice.invoice_number}* totaling *${amountStr}*, due on *${invoice.due_date}*.\n\n` +
    `*Payment Details:*\n` +
    `• UPI VPA: ${upiId}\n` +
    (user.bank_account_no ? `• Bank A/C: ${user.bank_account_no}\n` : '') +
    (user.bank_ifsc ? `• IFSC: ${user.bank_ifsc}\n` : '') +
    `• Beneficiary: ${businessName}\n\n` +
    `Please arrange payment at your earliest convenience or let us know if you need any clarification.\n\n` +
    `Warm regards,\n` +
    `${senderName} · ${businessName}`
  );
}

/**
 * Returns a wa.me URL for the specified phone number and encoded text.
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  // Strip non-numeric characters except +
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  
  // If user entered a 10 digit Indian number without country code, prepend 91
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }

  const encoded = encodeURIComponent(message);
  if (!cleanNumber) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}
