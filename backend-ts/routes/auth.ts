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
  const { email, password, full_name, business_name } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  if (db.isCloudConnected()) {
    const supabaseAdmin = db.getSupabaseAdmin();
    const supabaseAnon = db.getSupabaseAnonClient();
    if (supabaseAdmin) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || '',
          business_name: business_name || '',
        },
      });

      if (authErr) {
        return res.status(400).json({ error: authErr.message });
      }

      const userId = authData.user.id;
      let profile = await db.getProfile(userId);
      if (!profile) {
        profile = await db.upsertProfile({
          id: userId,
          email: normalizedEmail,
          full_name: full_name || '',
          business_name: business_name || '',
        });
      }

      let token = `dueflow_dev_${userId}_${Buffer.from(normalizedEmail).toString('base64')}`;
      if (supabaseAnon) {
        const { data: signInData } = await supabaseAnon.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInData?.session?.access_token) {
          token = signInData.session.access_token;
        }
      }

      return res.status(201).json({
        token,
        user: profile,
      });
    }
  }

  // Generate deterministic/unique user ID for local mode
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
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  if (db.isCloudConnected()) {
    const supabaseAnon = db.getSupabaseAnonClient();
    if (supabaseAnon) {
      const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInErr || !signInData.user || !signInData.session) {
        return res.status(401).json({ error: signInErr?.message || 'Invalid login credentials' });
      }

      let profile = await db.getProfile(signInData.user.id);
      if (!profile) {
        profile = await db.upsertProfile({
          id: signInData.user.id,
          email: normalizedEmail,
          full_name: signInData.user.user_metadata?.full_name || '',
          business_name: signInData.user.user_metadata?.business_name || '',
        });
      }

      return res.json({
        token: signInData.session.access_token,
        user: profile,
      });
    }
  }

  // Find or provision user in local mode
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
