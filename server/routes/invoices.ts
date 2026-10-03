import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import {
  validateRequest,
  createInvoiceSchema,
  updateInvoiceSchema,
  markUnpaidSchema,
} from '../middleware/validate';
import { sendEmail, renderReminderEmail, formatINR } from '../services/emailService';
import { generateAiReminder } from '../services/aiService';
import { getEmailProviderForUser } from '../services/email/providerFactory';
import { getWhatsAppProviderForUser } from '../services/whatsapp/providerFactory';

const router = Router();

// GET /api/invoices
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { search, status, sort, page, limit } = req.query;

  const result = await db.listInvoices(req.user!.id, {
    search: search ? String(search) : undefined,
    status: status ? String(status) : undefined,
    sort: sort ? String(sort) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });

  return res.json(result);
});

// POST /api/invoices
router.post('/', requireAuth, validateRequest({ body: createInvoiceSchema }), async (req: Request, res: Response) => {
  try {
    const created = await db.createInvoice(req.user!.id, req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    if (err.code === '23505' || err.message?.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// GET /api/invoices/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const invoice = await db.getInvoice(req.user!.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const rules = await db.getRulesForInvoice(invoice.id);
  const logs = await db.getLogsForInvoice(invoice.id);

  return res.json({
    invoice,
    rules,
    logs,
  });
});

// PUT /api/invoices/:id
router.put('/:id', requireAuth, validateRequest({ body: updateInvoiceSchema }), async (req: Request, res: Response) => {
  const updated = await db.updateInvoice(req.user!.id, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  return res.json(updated);
});

// DELETE /api/invoices/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const success = await db.deleteInvoice(req.user!.id, req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  return res.json({ message: 'Invoice deleted successfully' });
});

// POST /api/invoices/:id/mark-paid
router.post('/:id/mark-paid', requireAuth, async (req: Request, res: Response) => {
  try {
    const updated = await db.markInvoicePaid(req.user!.id, req.params.id);
    return res.json({
      message: 'Invoice marked as paid. Future pending reminders have been cancelled.',
      invoice: updated,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Invoice not found' });
  }
});

// POST /api/invoices/:id/mark-unpaid
router.post('/:id/mark-unpaid', requireAuth, validateRequest({ body: markUnpaidSchema }), async (req: Request, res: Response) => {
  try {
    const result = await db.markInvoiceUnpaid(req.user!.id, req.params.id);
    return res.json({
      message: 'Invoice marked as unpaid. Future reminder schedule recomputed.',
      invoice: result,
      rules: result.rules,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Invoice not found' });
  }
});

// POST /api/invoices/:id/toggle-reminders
router.post('/:id/toggle-reminders', requireAuth, async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: '"enabled" boolean is required' });
  }

  try {
    const updated = await db.toggleReminders(req.user!.id, req.params.id, enabled);
    return res.json({
      message: `Reminders ${enabled ? 'enabled' : 'disabled'} for this invoice.`,
      invoice: updated,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Invoice not found' });
  }
});

// POST /api/invoices/:id/nudge (Manual Instant Follow-up)
router.post('/:id/nudge', requireAuth, async (req: Request, res: Response) => {
  const invoice = await db.getInvoice(req.user!.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (invoice.status === 'paid') {
    return res.status(400).json({ error: 'Cannot send reminder for an invoice already marked paid' });
  }

  const profile = await db.getProfile(req.user!.id);
  const { customSubject, customBody, tone, channel: requestedChannel, recipient_phone } = req.body;

  // Determine channel to use
  let channel: 'email' | 'whatsapp' | 'both' = requestedChannel;
  if (!channel) {
    channel = (invoice as any).reminder_channel !== 'default' && (invoice as any).reminder_channel
      ? (invoice as any).reminder_channel
      : profile?.default_reminder_channel || 'email';
  }

  let subject = customSubject;
  let body = customBody;

  // If user selected tone or no custom copy provided, generate appropriate copy
  if (!body) {
    const aiResult = await generateAiReminder({
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      clientName: invoice.client_name_snapshot,
      businessName: profile?.business_name,
      senderName: profile?.full_name,
      tone: tone || 'professional',
    });
    subject = aiResult.subject;
    body = aiResult.body;
  }

  const results: any = { email: null, whatsapp: null };
  const createdLogs = [];

  // 1. Dispatch Email if selected
  if (channel === 'email' || channel === 'both') {
    const { provider: emailProvider, isUserConnected, connectedEmail } = await getEmailProviderForUser(req.user!.id);
    const emailData = renderReminderEmail({
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      clientName: invoice.client_name_snapshot,
      clientEmail: invoice.client_email_snapshot,
      businessName: profile?.business_name || '',
      senderName: profile?.full_name || '',
      senderEmail: connectedEmail || profile?.email || req.user!.email,
      upiId: profile?.upi_id,
      bankAccount: profile?.bank_account,
      bankIfsc: profile?.bank_ifsc,
      notes: invoice.notes,
      customSubject: subject,
      customBody: body,
    });

    const sendRes = await emailProvider.sendEmail({
      to: invoice.client_email_snapshot,
      fromName: profile?.business_name || profile?.full_name || 'DueFlow Invoicing',
      fromEmail: connectedEmail || profile?.email || req.user!.email,
      replyTo: profile?.email || req.user!.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    results.email = sendRes;

    const emailLog = await db.recordLog({
      invoice_id: invoice.id,
      rule_id: null,
      channel: 'email',
      provider: sendRes.provider,
      occurrence_key: `manual_nudge_email_${Date.now()}`,
      recipient_email: invoice.client_email_snapshot,
      recipient: invoice.client_email_snapshot,
      subject: emailData.subject,
      provider_message_id: sendRes.providerMessageId || null,
      status: sendRes.success ? 'sent' : 'failed',
      error_code: sendRes.errorMessage || sendRes.errorCode || null,
      retryable: sendRes.retryable ?? false,
      attempted_at: new Date().toISOString(),
      sent_at: sendRes.success ? new Date().toISOString() : null,
    });
    createdLogs.push(emailLog);
  }

  // 2. Dispatch WhatsApp if selected
  if (channel === 'whatsapp' || channel === 'both') {
    const { provider: waProvider, isConnected, status: waStatus } = await getWhatsAppProviderForUser(req.user!.id);
    const clientPhone = recipient_phone || (invoice as any).client_phone_snapshot;

    if (!waProvider || !isConnected) {
      if (channel === 'whatsapp') {
        return res.status(400).json({
          success: false,
          code: 'WHATSAPP_NOT_CONNECTED',
          message: `WhatsApp Business is not connected (${waStatus}). Please connect in Settings.`,
        });
      }
    } else if (!clientPhone) {
      if (channel === 'whatsapp') {
        return res.status(400).json({
          success: false,
          code: 'MISSING_CLIENT_PHONE',
          message: 'Client does not have a phone number configured for WhatsApp dispatch.',
        });
      }
    } else {
      const waRes = await waProvider.sendTemplateMessage({
        toPhone: clientPhone,
        templateName: 'invoice_payment_reminder',
        variables: {
          clientName: invoice.client_name_snapshot,
          invoiceNumber: invoice.invoice_number,
          amountFormatted: formatINR(invoice.amount),
          dueDate: invoice.due_date,
          businessName: profile?.business_name || profile?.full_name || 'Studio',
          paymentLinkOrUpi: profile?.upi_id ? `UPI: ${profile.upi_id}` : undefined,
        },
      });

      results.whatsapp = waRes;

      const waLog = await db.recordLog({
        invoice_id: invoice.id,
        rule_id: null,
        channel: 'whatsapp',
        provider: waRes.provider,
        occurrence_key: `manual_nudge_whatsapp_${Date.now()}`,
        recipient_phone: clientPhone,
        recipient: clientPhone,
        subject: `Invoice ${invoice.invoice_number} reminder`,
        provider_message_id: waRes.providerMessageId || null,
        status: waRes.success ? 'sent' : 'failed',
        error_code: waRes.errorMessage || waRes.errorCode || null,
        retryable: waRes.retryable ?? false,
        attempted_at: new Date().toISOString(),
        sent_at: waRes.success ? new Date().toISOString() : null,
      });
      createdLogs.push(waLog);
    }
  }

  const overallSuccess =
    (results.email ? results.email.success : true) &&
    (results.whatsapp ? results.whatsapp.success : true);

  return res.json({
    success: overallSuccess,
    channel,
    results,
    logs: createdLogs,
    message: overallSuccess ? 'Reminder dispatched successfully.' : 'One or more reminder channels failed.',
  });
});

// GET /api/invoices/:id/preview-email
router.get('/:id/preview-email', requireAuth, async (req: Request, res: Response) => {
  const invoice = await db.getInvoice(req.user!.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const profile = await db.getProfile(req.user!.id);
  const stage = req.query.stage ? Number(req.query.stage) : 1;
  const tone = req.query.tone ? String(req.query.tone) : 'professional';

  const preview = renderReminderEmail({
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    dueDate: invoice.due_date,
    clientName: invoice.client_name_snapshot,
    clientEmail: invoice.client_email_snapshot,
    businessName: profile?.business_name || 'DueFlow Studio',
    senderName: profile?.full_name || 'Freelancer',
    senderEmail: profile?.email || req.user!.email,
    upiId: profile?.upi_id,
    bankAccount: profile?.bank_account,
    bankIfsc: profile?.bank_ifsc,
    notes: invoice.notes,
    stageName: `Stage ${stage}`,
  });

  return res.json(preview);
});

export default router;
