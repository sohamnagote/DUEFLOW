import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const stats = await db.getDashboardAggregates(req.user!.id);
  return res.json(stats);
});

export default router;
