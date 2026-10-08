import { Router, Request, Response } from 'express';
import { db } from '../db';
import { config } from '../config';
import { renderReminderEmail, formatINR } from '../services/emailService';
import { getEmailProviderForUser } from '../services/email/providerFactory';
import { getWhatsAppProviderForUser } from '../services/whatsapp/providerFactory';

const router = Router();

// POST /api/cron/process-reminders
router.post('/process-reminders', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const isCronSecret = authHeader === `Bearer ${config.CRON_SECRET}`;
  let isAuthenticatedUser = false;

  if (authHeader?.startsWith('Bearer ') && !isCronSecret) {
    const token = authHeader.split(' ')[1].trim();
    const supabaseAdmin = db.getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) isAuthenticatedUser = true;
    }
  }

  // Allow either CRON_SECRET or authenticated user session (for manual test runner trigger in UI)
  if (!isCronSecret && !isAuthenticatedUser) {
    return res.status(401).json({ error: 'Unauthorized invocation' });
  }

  const nowIso = new Date().toISOString();
  const dueItems = await db.getDuePendingRules(nowIso);

  const results = [];

  for (const item of dueItems) {
    const { rule, invoice, profile } = item;
    const channel = rule.channel || 'email';

    // Concurrency / Idempotency guard:
    // Check if already has a successful sent log for this exact occurrence_key and channel
    const existingLogs = await db.getLogsForInvoice(invoice.id);
    const alreadySent = existingLogs.some(
      (l) => l.occurrence_key === rule.occurrence_key && (l.status === 'sent' || l.status === 'delivered')
    );

    if (alreadySent) {
      await db.updateRuleStatus?.(rule.id, 'sent');
      rule.status = 'sent';
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel,
        skipped: true,
        reason: 'Already successfully sent for this channel and stage',
      });
      continue;
    }

    // Invariant check: Invoices must still be unpaid and reminders enabled
    if (invoice.status === 'paid' || !invoice.reminders_enabled) {
      rule.status = 'cancelled';
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel,
        skipped: true,
        reason: `Invoice status: ${invoice.status}, reminders_enabled: ${invoice.reminders_enabled}`,
      });
      continue;
    }

    // Check automation toggle for this specific channel
    if (channel === 'email' && profile.email_reminders_enabled === false) {
      rule.status = 'skipped';
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: 'email',
        skipped: true,
        reason: 'Email automated reminders are toggled OFF by user in Settings.',
      });
      continue;
    }

    if (channel === 'whatsapp' && profile.whatsapp_reminders_enabled === false) {
      rule.status = 'skipped';
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: 'whatsapp',
        skipped: true,
        reason: 'WhatsApp automated reminders are toggled OFF by user in Settings.',
      });
      continue;
    }

    // Mark rule as processing to prevent race conditions
    rule.status = 'processing';

    if (channel === 'email') {
      const { provider: emailProvider, isUserConnected, connectedEmail } = await getEmailProviderForUser(invoice.user_id);
      const emailData = renderReminderEmail({
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        dueDate: invoice.due_date,
        clientName: invoice.client_name_snapshot,
        clientEmail: invoice.client_email_snapshot,
        businessName: profile.business_name || profile.full_name,
        senderName: profile.full_name,
        senderEmail: connectedEmail || profile.email,
        upiId: profile.upi_id,
        bankAccount: profile.bank_account,
        bankIfsc: profile.bank_ifsc,
        notes: invoice.notes,
        stageName: rule.occurrence_key,
      });

      const emailResult = await emailProvider.sendEmail({
        to: invoice.client_email_snapshot,
        fromName: profile.business_name || profile.full_name,
        fromEmail: connectedEmail || profile.email,
        replyTo: profile.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      const logStatus = emailResult.success ? 'sent' : 'failed';

      await db.recordLog({
        invoice_id: invoice.id,
        rule_id: rule.id,
        channel: 'email',
        provider: emailResult.provider,
        occurrence_key: rule.occurrence_key,
        recipient_email: invoice.client_email_snapshot,
        recipient: invoice.client_email_snapshot,
        subject: emailData.subject,
        provider_message_id: emailResult.providerMessageId || null,
        status: logStatus,
        error_code: emailResult.errorMessage || emailResult.errorCode || null,
        retryable: emailResult.retryable ?? false,
        attempted_at: nowIso,
        sent_at: emailResult.success ? nowIso : null,
      });

      rule.status = emailResult.success ? 'sent' : 'failed';

      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: 'email',
        occurrence_key: rule.occurrence_key,
        status: logStatus,
        provider_message_id: emailResult.providerMessageId,
        error: emailResult.errorMessage,
      });
    } else if (channel === 'whatsapp') {
      const { provider: waProvider, isConnected } = await getWhatsAppProviderForUser(invoice.user_id);
      const clientPhone = invoice.client_phone_snapshot;

      if (!waProvider || !isConnected || !clientPhone) {
        rule.status = 'failed';
        results.push({
          rule_id: rule.id,
          invoice_number: invoice.invoice_number,
          channel: 'whatsapp',
          skipped: true,
          reason: !clientPhone ? 'Missing client phone number' : 'WhatsApp Business integration not connected',
        });
        continue;
      }

      const waResult = await waProvider.sendTemplateMessage({
        toPhone: clientPhone,
        templateName: 'invoice_payment_reminder',
        variables: {
          clientName: invoice.client_name_snapshot,
          invoiceNumber: invoice.invoice_number,
          amountFormatted: formatINR(invoice.amount),
          dueDate: invoice.due_date,
          businessName: profile.business_name || profile.full_name || 'Studio',
          paymentLinkOrUpi: profile.upi_id ? `UPI: ${profile.upi_id}` : undefined,
        },
      });

      const logStatus = waResult.success ? 'sent' : 'failed';

      await db.recordLog({
        invoice_id: invoice.id,
        rule_id: rule.id,
        channel: 'whatsapp',
        provider: waResult.provider,
        occurrence_key: rule.occurrence_key,
        recipient_phone: clientPhone,
        recipient: clientPhone,
        subject: `Invoice ${invoice.invoice_number} automated reminder`,
        provider_message_id: waResult.providerMessageId || null,
        status: logStatus,
        error_code: waResult.errorMessage || waResult.errorCode || null,
        retryable: waResult.retryable ?? false,
        attempted_at: nowIso,
        sent_at: waResult.success ? nowIso : null,
      });

      rule.status = waResult.success ? 'sent' : 'failed';

      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: 'whatsapp',
        occurrence_key: rule.occurrence_key,
        status: logStatus,
        provider_message_id: waResult.providerMessageId,
        error: waResult.errorMessage,
      });
    }
  }

  return res.json({
    timestamp: nowIso,
    processed_count: results.length,
    results,
  });
});

export default router;
