import { Router, Request, Response } from 'express';
import { db } from '../db';
import { config } from '../config';

const router = Router();

// POST /api/webhooks/resend
router.post('/resend', async (req: Request, res: Response) => {
  const signature = req.headers['svix-signature'] || req.headers['x-resend-signature'];
  if (config.RESEND_WEBHOOK_SECRET && !signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const { type, data } = req.body;
  const emailId = data?.email_id;

  if (!emailId) {
    return res.json({ message: 'Ignored webhook without email_id' });
  }

  let status: 'delivered' | 'bounced' | 'complained' | null = null;
  if (type === 'email.delivered') status = 'delivered';
  else if (type === 'email.bounced') status = 'bounced';
  else if (type === 'email.complained') status = 'complained';

  if (status) {
    const errorMsg = type === 'email.bounced' ? (data?.bounce?.message || 'Email bounced') : undefined;
    await db.updateLogDelivery(emailId, status, errorMsg);
  }

  return res.json({ processed: true, event: type, email_id: emailId });
});

// ---------------------------------------------------------------------------
// WHATSAPP WEBHOOKS (Verification & Status Events)
// ---------------------------------------------------------------------------

// GET /api/webhooks/whatsapp - Webhook Challenge Verification for Meta
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'dueflow_whatsapp_webhook_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook Verified]');
    return res.status(200).send(challenge);
  }

  // Also accept dev verification if token is provided
  if (mode === 'subscribe' && challenge) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: 'Verification token mismatch' });
});

// POST /api/webhooks/whatsapp - Webhook Event Processing
router.post('/whatsapp', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const statuses = value?.statuses || [];

        for (const st of statuses) {
          const messageId = st.id;
          const statusStr = st.status; // sent, delivered, read, failed

          let mappedStatus: 'delivered' | 'bounced' | 'failed' | null = null;
          if (statusStr === 'delivered' || statusStr === 'read') {
            mappedStatus = 'delivered';
          } else if (statusStr === 'failed') {
            mappedStatus = 'failed';
          }

          if (mappedStatus && messageId) {
            const errorMsg = st.errors?.[0]?.message || (statusStr === 'failed' ? 'Message delivery failed' : undefined);
            await db.updateLogDelivery(messageId, mappedStatus, errorMsg);
          }
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  }

  return res.status(200).json({ status: 'ignored' });
});

export default router;
