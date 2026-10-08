import { jsPDF } from 'jspdf';
import { Invoice, UserProfile } from '../types';
import { formatINR } from './reminderEngine';

export function generateInvoicePDF(invoice: Invoice, user?: UserProfile): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 1. Brand / Header Banner
  doc.setFillColor(28, 27, 27); // #1c1b1b
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DueFlow', margin, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(202, 198, 255); // #cac6ff accent
  doc.text('AUTOMATED INVOICE FOLLOW-UP & SETTLEMENT UTILITY', margin, 20);

  // Status Badge on top right
  const statusLabel = invoice.status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`STATUS: ${statusLabel}`, pageWidth - margin, 17, { align: 'right' });

  y = 38;

  // 2. Freelancer / Business Details (From) & Invoice Meta (Right)
  doc.setTextColor(116, 120, 120); // #747878
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED BY', margin, y);
  doc.text('INVOICE DETAILS', pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setTextColor(26, 27, 34); // #1a1b22
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(user?.business_name || user?.full_name || 'Creative Studio', margin, y);

  doc.setFontSize(14);
  doc.text(invoice.invoice_number, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (user?.full_name) {
    doc.text(user.full_name, margin, y);
  }
  doc.text(`Issue Date: ${invoice.issue_date}`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  if (user?.email) {
    doc.text(user.email, margin, y);
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.status === 'overdue' ? 186 : 26, invoice.status === 'overdue' ? 26 : 27, invoice.status === 'overdue' ? 26 : 34);
  doc.text(`Due Date: ${invoice.due_date}`, pageWidth - margin, y, { align: 'right' });

  if (user?.phone) {
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(68, 71, 72);
    doc.text(`Phone: ${user.phone}`, margin, y);
  }

  y += 10;

  // Divider line
  doc.setDrawColor(227, 225, 234); // #e3e1ea
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // 3. Client / Bill To Box
  doc.setFillColor(244, 242, 252); // #f4f2fc
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(91, 89, 139); // #5b598b
  doc.text('BILLED TO (CLIENT ACCOUNT)', margin + 4, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(26, 27, 34);
  doc.text(invoice.client_name, margin + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(68, 71, 72);
  doc.text(`Email: ${invoice.client_email}`, margin + 4, y + 19);

  if (invoice.client_attn || invoice.client_cin) {
    const extra = [invoice.client_attn, invoice.client_cin].filter(Boolean).join(' | ');
    doc.setFontSize(8);
    doc.setTextColor(116, 120, 120);
    doc.text(extra, margin + 4, y + 23.5);
  }

  y += 34;

  // 4. Line Items Table Header
  doc.setFillColor(238, 237, 246); // #eeedf6
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 27, 34);
  doc.text('DESCRIPTION & DELIVERABLES', margin + 4, y + 5.5);
  doc.text('CADENCE', margin + contentWidth * 0.55, y + 5.5);
  doc.text('TOTAL AMOUNT', margin + contentWidth - 4, y + 5.5, { align: 'right' });

  y += 8;

  // Line Item Row
  const itemHeight = 16;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, itemHeight, 'F');
  doc.setDrawColor(227, 225, 234);
  doc.line(margin, y + itemHeight, margin + contentWidth, y + itemHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 27, 34);
  doc.text(invoice.notes ? `Deliverable: ${invoice.notes}` : 'Professional Creative & Development Services', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(116, 120, 120);
  doc.text(`Standard Engagement · ${invoice.tone_template || 'Gentle Studio'}`, margin + 4, y + 11);

  doc.text(invoice.reminders_enabled ? '4-Step Active' : 'Paused', margin + contentWidth * 0.55, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 27, 34);
  doc.text(formatINR(invoice.amount), margin + contentWidth - 4, y + 9, { align: 'right' });

  y += itemHeight + 6;

  // 5. Total Summary Card
  const totalBoxWidth = 75;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  doc.setFillColor(251, 248, 255); // #fbf8ff
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(116, 120, 120);
  doc.text('SUBTOTAL', totalBoxX + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(formatINR(invoice.amount), totalBoxX + totalBoxWidth - 4, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('TAX / GST', totalBoxX + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text('₹0.00 (Exempt/Direct)', totalBoxX + totalBoxWidth - 4, y + 12, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 27, 34);
  doc.text('TOTAL DUE', totalBoxX + 4, y + 19);
  doc.setTextColor(91, 89, 139);
  doc.text(formatINR(invoice.amount), totalBoxX + totalBoxWidth - 4, y + 19, { align: 'right' });

  // 6. Direct Settlement / Banking Coordinates (Left Side)
  const bankBoxWidth = contentWidth - totalBoxWidth - 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(227, 225, 234);
  doc.roundedRect(margin, y, bankBoxWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(91, 89, 139);
  doc.text('DIRECT REMITTANCE & BANKING COORDINATES (INR)', margin + 4, y + 6);

  doc.setFontSize(8);
  doc.setTextColor(68, 71, 72);

  let bankY = y + 12;
  const addBankLine = (label: string, val: string | undefined, isMono = false) => {
    if (!val) return;
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin + 4, bankY);
    doc.setFont(isMono ? 'courier' : 'helvetica', 'normal');
    doc.text(val, margin + 36, bankY);
    bankY += 5;
  };

  addBankLine('UPI VPA', user?.upi_id, true);
  addBankLine('Beneficiary', user?.bank_account_name || user?.full_name);
  addBankLine('Account No', user?.bank_account_no, true);
  addBankLine('IFSC Code', user?.bank_ifsc, true);
  addBankLine('Bank & Branch', user?.bank_name);

  y += 48;

  // 7. Automated Cadence Steps (Audit Box)
  if (invoice.rules && invoice.rules.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(116, 120, 120);
    doc.text('REMINDER CADENCE SCHEDULE', margin, y);

    y += 4;
    doc.setDrawColor(227, 225, 234);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);

    y += 5;
    invoice.rules.forEach((rule, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(rule.status === 'delivered' ? 91 : 68, rule.status === 'delivered' ? 89 : 71, rule.status === 'delivered' ? 139 : 72);
      doc.text(`Stage 0${idx + 1} (${rule.scheduled_for})`, margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(116, 120, 120);
      const stageSubject = rule.subject_line.length > 50 ? `${rule.subject_line.substring(0, 50)}...` : rule.subject_line;
      doc.text(stageSubject, margin + 42, y);

      doc.setFont('helvetica', 'bold');
      doc.text(rule.status === 'delivered' ? 'DELIVERED' : rule.status.toUpperCase(), margin + contentWidth, y, { align: 'right' });

      y += 4.5;
    });
  }

  // 8. Footer Legal / System Note
  const footerY = 282;
  doc.setDrawColor(227, 225, 234);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(116, 120, 120);
  doc.text('DueFlow · Automated Invoice Follow-Up', margin, footerY);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, pageWidth - margin, footerY, { align: 'right' });

  // Save the PDF with a clean filename
  const safeFilename = `${invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}_Summary.pdf`;
  doc.save(safeFilename);
}
