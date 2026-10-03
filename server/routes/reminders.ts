import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/reminders/rules
router.get('/rules', requireAuth, async (req: Request, res: Response) => {
  const { invoices } = await db.listInvoices(req.user!.id);
  const allRules = [];

  for (const inv of invoices) {
    const rules = await db.getRulesForInvoice(inv.id);
    for (const r of rules) {
      allRules.push({
        ...r,
        invoice_number: inv.invoice_number,
        client_name: inv.client_name_snapshot,
        amount: inv.amount,
        due_date: inv.due_date,
      });
    }
  }

  return res.json({ rules: allRules });
});

// GET /api/reminders/logs
router.get('/logs', requireAuth, async (req: Request, res: Response) => {
  const { invoices } = await db.listInvoices(req.user!.id);
  const allLogs = [];

  for (const inv of invoices) {
    const logs = await db.getLogsForInvoice(inv.id);
    for (const l of logs) {
      allLogs.push({
        ...l,
        invoice_number: inv.invoice_number,
        client_name: inv.client_name_snapshot,
        amount: inv.amount,
      });
    }
  }

  allLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return res.json({ logs: allLogs });
});

export default router;
