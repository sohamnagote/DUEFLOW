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

  const paymentSection = `
PAYMENT DETAILS:
• UPI ID: ${upiId}
• Account: ${bankAcc}
• IFSC: ${bankIfsc}
• Bank: ${bankName}
• Beneficiary: ${businessName}
  `;

  const bodyText = `
Hi ${clientName},

${opening}

${urgencyNote}

${paymentSection}

Invoice Details:
• Invoice Number: ${invoiceNum}
• Total Amount: ${amountStr}
• Due Date: ${dueDateStr}
• Notes: ${invoice.notes || 'Deliverables submitted as per agreement.'}

Thank you,
${senderName}
${businessName}
Reply directly to this email or reach us at ${user.email}.
  `.trim();

  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1b22; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 2px solid #1a1b22; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">${businessName}</span>
        <span style="float: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #5b598b; font-weight: 700;">DueFlow Automated Dispatch</span>
      </div>

      <p style="font-size: 15px; margin-bottom: 16px;">Hi <strong>${clientName}</strong>,</p>
      <p style="font-size: 15px; margin-bottom: 16px;">${opening}</p>
      <p style="font-size: 15px; margin-bottom: 24px; color: #444748;">${urgencyNote}</p>

      <div style="background-color: #f4f2fc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #5b598b; margin-bottom: 12px;">Invoice Summary</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #444748;">Invoice:</span>
          <strong>${invoiceNum}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #444748;">Total Due:</span>
          <strong style="font-size: 18px; color: #1a1b22;">${amountStr}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #444748;">Due Date:</span>
          <strong style="color: ${stageNumber >= 3 ? '#ba1a1a' : '#1a1b22'};">${dueDateStr}</strong>
        </div>
      </div>

      <div style="border: 1px solid #e3e1ea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #1a1b22; margin-bottom: 12px;">Payment Details</div>
        <div style="font-size: 13px; line-height: 1.8; color: #444748;">
          <div><strong>Instant UPI:</strong> <code style="background: #e8e7f0; padding: 2px 6px; border-radius: 4px; color: #1a1b22;">${upiId}</code></div>
          <div><strong>Virtual A/C:</strong> ${bankAcc}</div>
          <div><strong>Bank IFSC:</strong> ${bankIfsc}</div>
          <div><strong>Bank:</strong> ${bankName}</div>
          <div><strong>Beneficiary:</strong> ${businessName}</div>
        </div>
      </div>

      <p style="font-size: 13px; color: #747878; margin-top: 32px; border-top: 1px solid #e3e1ea; padding-top: 16px;">
        Sent via DueFlow on behalf of ${senderName} (${user.email}). If you have already paid, please reply with your payment confirmation.
      </p>
    </div>
  `;

  return { subject, bodyHtml, bodyText };
}
