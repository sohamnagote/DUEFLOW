import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { validateRequest, updateProfileSchema } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().optional().default(''),
  business_name: z.string().optional().default(''),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
});

// POST /api/auth/signup
router.post('/signup', validateRequest({ body: signupSchema }), async (req: Request, res: Response) => {
  const { email, full_name, business_name } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Generate deterministic/unique user ID
  const userId = crypto.randomUUID();

  // Create profile in database
  const profile = await db.upsertProfile({
    id: userId,
    email: normalizedEmail,
    full_name: full_name || '',
    business_name: business_name || '',
  });

  // Generate bearer session token
  const token = `dueflow_dev_${userId}_${Buffer.from(normalizedEmail).toString('base64')}`;

  return res.status(201).json({
    token,
    user: profile,
  });
});

// POST /api/auth/login
router.post('/login', validateRequest({ body: loginSchema }), async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Find or provision user
  let profile = await db.findProfileByEmail(normalizedEmail);

  let userId = profile?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    profile = await db.upsertProfile({
      id: userId,
      email: normalizedEmail,
      full_name: 'Freelancer Professional',
      business_name: 'Agency Studio',
    });
  }

  const token = `dueflow_dev_${userId}_${Buffer.from(normalizedEmail).toString('base64')}`;

  return res.json({
    token,
    user: profile,
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const profile = await db.getProfile(req.user!.id);
  return res.json({ user: profile });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

// GET /api/profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  const profile = await db.getProfile(req.user!.id);
  return res.json({ profile });
});

// PUT /api/profile
router.put('/profile', requireAuth, validateRequest({ body: updateProfileSchema }), async (req: Request, res: Response) => {
  const updated = await db.upsertProfile({
    id: req.user!.id,
    email: req.user!.email,
    ...req.body,
  });
  return res.json({ profile: updated });
});

export default router;
