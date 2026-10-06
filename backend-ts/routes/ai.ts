import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { validateRequest, aiReminderSchema } from '../middleware/validate';
import { generateAiReminder } from '../services/aiService';

const router = Router();

// POST /api/ai/generate-reminder
router.post('/generate-reminder', requireAuth, validateRequest({ body: aiReminderSchema }), async (req: Request, res: Response) => {
  const { invoice_id, invoice_number, amount, due_date, client_name, tone } = req.body;
  const startMs = Date.now();

  let targetInvNum = invoice_number || 'INV-001';
  let targetAmount = amount || 50000;
  let targetDueDate = due_date || new Date().toISOString().split('T')[0];
  let targetClientName = client_name || 'Client';

  if (invoice_id) {
    const invoice = await db.getInvoice(req.user!.id, invoice_id);
    if (invoice) {
      targetInvNum = invoice.invoice_number;
      targetAmount = invoice.amount;
      targetDueDate = invoice.due_date;
      targetClientName = invoice.client_name_snapshot;
    }
  }

  const profile = await db.getProfile(req.user!.id);

  const result = await generateAiReminder({
    invoiceNumber: targetInvNum,
    amount: targetAmount,
    dueDate: targetDueDate,
    clientName: targetClientName,
    businessName: profile?.business_name,
    senderName: profile?.full_name,
    tone: tone || 'professional',
  });

  const latencyMs = Date.now() - startMs;

  // Audit log
  await db.logAiAction({
    user_id: req.user!.id,
    invoice_id: invoice_id || null,
    action_type: 'generate_reminder_copy',
    prompt_summary: `Tone: ${tone}, Invoice: ${targetInvNum}`,
    model_used: result.modelUsed,
    generated_subject: result.subject,
    generated_body: result.body,
    latency_ms: latencyMs,
    is_fallback: result.isFallback,
  });

  return res.json(result);
});

export default router;
