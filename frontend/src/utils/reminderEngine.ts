import { Invoice, ReminderRule, ToneTemplate, UserProfile } from '../types';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateOccurrenceKey(invoiceId: string, stageNumber: number): string {
  return `${invoiceId}_occ_stage_${stageNumber}`;
}

export function generateCadenceRules(
  invoiceId: string,
  invoiceNumber: string,
  dueDateStr: string,
  tone: ToneTemplate = 'Gentle Creative Professional'
): ReminderRule[] {
  // 4-Stage Automated Cadence
  const stages: { number: 1 | 2 | 3 | 4; label: string; offset: number; subject: string }[] = [
    {
      number: 1,
      label: 'Stage 01 · Friendly Reminder',
      offset: -3,
      subject: `Friendly reminder: Invoice ${invoiceNumber} is due in 3 days`,
    },
    {
      number: 2,
      label: 'Stage 02 · Due Date Reminder',
      offset: 0,
      subject: `Reminder: Invoice ${invoiceNumber} is due today`,
    },
    {
      number: 3,
      label: 'Stage 03 · Overdue Reminder',
      offset: 3,
      subject: `Follow-up: Invoice ${invoiceNumber} is 3 days overdue`,
    },
    {
      number: 4,
      label: 'Stage 04 · Final Reminder',
      offset: 7,
      subject: `Final reminder: Invoice ${invoiceNumber} is 7 days overdue`,
    },
  ];

  return stages.map((st) => ({
    id: `rule-${invoiceId}-${st.number}`,
    invoice_id: invoiceId,
    stage_number: st.number,
    stage_label: st.label,
    offset_days: st.offset,
    subject_line: st.subject,
    scheduled_for: `Relative offset ${st.offset >= 0 ? '+' : ''}${st.offset}d`,
    status: 'scheduled',
  }));
}

export function getEmailTemplateContent(
  stageNumber: number,
  invoice: Invoice,
  user: UserProfile
): { subject: string; bodyHtml: string; bodyText: string } {
  const clientName = invoice.client_name;
  const invoiceNum = invoice.invoice_number;
  const amountStr = formatINR(invoice.amount);
  const dueDateStr = invoice.due_date;
  const senderName = user.full_name;
  const businessName = user.business_name;
  const upiId = user.upi_id;
  const bankAcc = user.bank_account_no;
  const bankIfsc = user.bank_ifsc;
  const bankName = user.bank_name;

  let subject = '';
  let opening = '';
  let urgencyNote = '';

  switch (stageNumber) {
    case 1:
      subject = `Friendly reminder: ${invoiceNum} from ${businessName}`;
      opening = `Hope you are having a great week. This is a polite reminder that invoice ${invoiceNum} for ${amountStr} is due on ${dueDateStr}.`;
      urgencyNote = `If you have already arranged payment, please disregard this note.`;
      break;
    case 2:
      subject = `Invoice ${invoiceNum} due today (${amountStr}) - ${businessName}`;
      opening = `This is a reminder that invoice ${invoiceNum} for ${amountStr} is due today, ${dueDateStr}.`;
      urgencyNote = `Payment details are included below for quick transfer.`;
      break;
    case 3:
      subject = `Overdue reminder: Invoice ${invoiceNum} (${amountStr})`;
      opening = `We are following up on invoice ${invoiceNum} for ${amountStr}, which was due on ${dueDateStr} (now 3 days overdue).`;
      urgencyNote = `Please let us know once payment has been processed or if you need any assistance.`;
      break;
    case 4:
    default:
      subject = `Final reminder: Invoice ${invoiceNum} (${amountStr})`;
      opening = `We have not yet received payment for invoice ${invoiceNum} (${amountStr}), originally due on ${dueDateStr}.`;
      urgencyNote = `Please prioritize this payment today, or reach out to us if you have any questions.`;
      break;
  }

  const qrCodeUrl = user.payment_qr_url;
  const paymentNotes = user.payment_notes;
  const address = user.address;

  let paymentText = '';
  if (upiId || bankAcc || paymentNotes) {
    paymentText += '\nPayment Details:\n';
    if (upiId) paymentText += `• UPI ID: ${upiId}\n`;
    if (bankName) paymentText += `• Bank: ${bankName}\n`;
    if (bankAcc) paymentText += `• Account: ${bankAcc}\n`;
    if (bankIfsc) paymentText += `• IFSC: ${bankIfsc}\n`;
    if (paymentNotes) paymentText += `• Notes: ${paymentNotes}\n`;
  }

  const bodyText = `
Hi ${clientName},

${opening}

${urgencyNote}
${paymentText}
Invoice Details:
• Invoice Number: ${invoiceNum}
• Amount: ${amountStr}
• Due Date: ${dueDateStr}
${invoice.notes ? `• Notes: ${invoice.notes}\n` : ''}
Best regards,
${senderName}
${businessName}
${user.email}${address ? `\n${address}` : ''}
  `.trim();

  let paymentHtml = '';
  if (upiId || bankAcc || paymentNotes || qrCodeUrl) {
    paymentHtml = `
      <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; color: #9d174d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Payment Instructions</div>
        <div style="font-size: 13px; line-height: 1.7; color: #831843;">
          ${upiId ? `<div><strong>UPI ID:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; color: #9d174d; border: 1px solid #fbcfe8;">${upiId}</code></div>` : ''}
          ${bankName ? `<div><strong>Bank:</strong> ${bankName}</div>` : ''}
          ${bankAcc ? `<div><strong>Account Number:</strong> ${bankAcc}</div>` : ''}
          ${bankIfsc ? `<div><strong>IFSC Code:</strong> ${bankIfsc}</div>` : ''}
          ${paymentNotes ? `<div style="margin-top: 8px; font-style: italic;">Note: ${paymentNotes}</div>` : ''}
        </div>
        ${qrCodeUrl ? `
          <div style="text-align: center; padding: 16px; background: #ffffff; border: 1px solid #fbcfe8; border-radius: 8px; margin-top: 14px;">
            <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;">Scan with any UPI app to pay</div>
            <img src="${qrCodeUrl}" alt="Payment QR Code" style="max-width: 150px; max-height: 150px; border-radius: 6px; display: inline-block;" />
          </div>
        ` : ''}
      </div>
    `;
  }

  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #0f172a; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${businessName}</span>
      </div>

      <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">Hi ${clientName},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 14px;">${opening}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 20px;">${urgencyNote}</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Invoice Number</td>
            <td align="right" style="font-weight: 600; color: #0f172a;">${invoiceNum}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Due Date</td>
            <td align="right" style="font-weight: 600; color: #0f172a;">${dueDateStr}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
              <table width="100%">
                <tr>
                  <td style="font-weight: 600; color: #0f172a; font-size: 14px;">Amount Due</td>
                  <td align="right" style="font-size: 20px; font-weight: 700; color: #0f172a;">${amountStr}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      ${paymentHtml}

      <div style="font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5;">
        <div>${senderName} · ${businessName}</div>
        <div>Contact: <a href="mailto:${user.email}" style="color: #6366f1; text-decoration: none;">${user.email}</a></div>
      </div>
    </div>
  `;

  return { subject, bodyHtml, bodyText };
}
