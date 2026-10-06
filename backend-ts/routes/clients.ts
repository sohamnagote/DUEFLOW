import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { validateRequest, createClientSchema } from '../middleware/validate';

const router = Router();

// GET /api/clients
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const clients = await db.listClients(req.user!.id);
  const { invoices } = await db.listInvoices(req.user!.id);

  // Compute pending balance and total invoiced per client
  const enriched = clients.map((client) => {
    const clientInvoices = invoices.filter(
      (inv) => inv.client_id === client.id || inv.client_email_snapshot.toLowerCase() === client.email.toLowerCase()
    );

    let totalInvoiced = 0;
    let pendingBalance = 0;

    for (const inv of clientInvoices) {
      totalInvoiced += inv.amount;
      if (inv.operational_status !== 'paid') {
        pendingBalance += inv.amount;
      }
    }

    return {
      ...client,
      invoices_count: clientInvoices.length,
      total_invoiced: totalInvoiced,
      pending_balance: pendingBalance,
    };
  });

  return res.json({ clients: enriched });
});

// POST /api/clients
router.post('/', requireAuth, validateRequest({ body: createClientSchema }), async (req: Request, res: Response) => {
  const client = await db.createClient(req.user!.id, req.body);
  return res.status(201).json(client);
});

// GET /api/clients/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const client = await db.getClient(req.user!.id, req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  return res.json(client);
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const updated = await db.updateClient(req.user!.id, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Client not found' });
  }
  return res.json(updated);
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const success = await db.deleteClient(req.user!.id, req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Client not found' });
  }
  return res.json({ message: 'Client deleted successfully' });
});

export default router;
