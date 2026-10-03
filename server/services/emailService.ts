import { Resend } from 'resend';
import { config } from '../config';

let resendClient: Resend | null = null;
if (config.RESEND_API_KEY) {
  resendClient = new Resend(config.RESEND_API_KEY);
}

export interface EmailRenderData {
  invoiceNumber: string;
  amount: number | string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  businessName: string;
  senderName: string;
  senderEmail: string;
  upiId?: string;
  bankAccount?: string;
  bankIfsc?: string;
  notes?: string;
  customSubject?: string;
  customBody?: string;
  stageName?: string;
}

export function formatINR(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderReminderEmail(data: EmailRenderData): { subject: string; html: string; text: string } {
  const formattedAmount = formatINR(data.amount);
  const subject = data.customSubject || `Follow-up: Invoice ${data.invoiceNumber} payment reminder - ${formattedAmount}`;
  
  const bodyText = data.customBody || `Dear ${data.clientName},\n\nThis is a friendly reminder regarding invoice ${data.invoiceNumber} for ${formattedAmount}, due on ${data.dueDate}.\n\nPlease arrange for payment via the details provided below. Thank you!`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .body-copy { font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-line; margin-bottom: 24px; }
    .invoice-card { background: #f1f5f9; border-radius: 6px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 600; color: #0f172a; }
    .amount-val { font-size: 18px; color: #4338ca; }
    .payment-details { background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px; padding: 16px; margin: 24px 0; }
    .payment-title { font-size: 13px; font-weight: 700; color: #701a75; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.businessName || data.senderName || 'Invoice Follow-up'}</h1>
      <p>Automated payment ledger reminder</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.clientName},</div>
      <div class="body-copy">${bodyText}</div>

      <div class="invoice-card">
        <div class="row">
          <span class="label">Invoice Reference</span>
          <span class="val">${data.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Due Date</span>
          <span class="val">${data.dueDate}</span>
        </div>
        <div class="row">
          <span class="label">Total Payable</span>
          <span class="val amount-val">${formattedAmount}</span>
        </div>
      </div>

      ${(data.upiId || data.bankAccount) ? `
        <div class="payment-details">
          <div class="payment-title">Payment Settlement Instructions</div>
          ${data.upiId ? `<div class="row"><span class="label">UPI ID:</span> <span class="val">${data.upiId}</span></div>` : ''}
          ${data.bankAccount ? `<div class="row"><span class="label">Bank Account:</span> <span class="val">${data.bankAccount}</span></div>` : ''}
          ${data.bankIfsc ? `<div class="row"><span class="label">IFSC Code:</span> <span class="val">${data.bankIfsc}</span></div>` : ''}
        </div>
      ` : ''}

      ${data.notes ? `<p style="font-size: 13px; color: #64748b; font-style: italic;">Note: ${data.notes}</p>` : ''}
    </div>
    <div class="footer">
      Sent via DueFlow on behalf of ${data.businessName || data.senderName} (${data.senderEmail}).
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Dear ${data.clientName},

${bodyText}

---
INVOICE DETAILS
Invoice Number: ${data.invoiceNumber}
Amount: ${formattedAmount}
Due Date: ${data.dueDate}

${data.upiId ? `UPI ID: ${data.upiId}\n` : ''}${data.bankAccount ? `Bank Account: ${data.bankAccount}\nIFSC: ${data.bankIfsc}\n` : ''}
${data.notes ? `Note: ${data.notes}\n` : ''}
---
Sent via DueFlow on behalf of ${data.businessName || data.senderName} (${data.senderEmail}).
  `.trim();

  return { subject, html, text };
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  replyTo: string,
  data: EmailRenderData
): Promise<SendEmailResult> {
  const { subject, html, text } = renderReminderEmail(data);

  if (!resendClient) {
    // If RESEND_API_KEY is not configured in local environment, log and return simulated message ID
    console.log(`[Resend Sandbox] Sending reminder to ${to} for invoice ${data.invoiceNumber} - ${subject}`);
    return {
      success: true,
      providerMessageId: `msg_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  try {
    const res = await resendClient.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to,
      replyTo,
      subject,
      html,
      text,
    });

    if (res.error) {
      console.error('[Resend Error]', res.error);
      return {
        success: false,
        error: res.error.message || 'Resend delivery failed',
      };
    }

    return {
      success: true,
      providerMessageId: res.data?.id,
    };
  } catch (err: any) {
    console.error('[Resend Exception]', err);
    return {
      success: false,
      error: err.message || 'Network exception sending email',
    };
  }
}
