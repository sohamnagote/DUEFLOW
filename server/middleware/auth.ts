import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { config } from '../config';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

let supabaseClient: any = null;
if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
  try {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  } catch (e) {
    // ignore
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Authorization token not provided' });
  }

  try {
    // If Supabase remote auth is active, verify JWT with Supabase
    if (supabaseClient && !token.startsWith('dueflow_dev_')) {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired authentication session' });
      }

      req.user = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        business_name: user.user_metadata?.business_name || '',
      };
      return next();
    }

    // Local / Dev / Test token parser (e.g. dueflow_dev_<userId>_<emailBase64>)
    if (token.startsWith('dueflow_dev_')) {
      const parts = token.replace('dueflow_dev_', '').split('_');
      const userId = parts[0] || '00000000-0000-0000-0000-000000000001';
      let email = 'user@dueflow.in';
      if (parts[1]) {
        try {
          email = Buffer.from(parts[1], 'base64').toString('utf8');
        } catch {}
      }

      // Ensure profile exists in DB
      let profile = await db.getProfile(userId);
      if (!profile) {
        profile = await db.upsertProfile({
          id: userId,
          email,
          full_name: 'Freelancer Professional',
          business_name: 'Agency Studio',
        });
      }

      req.user = {
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        business_name: profile.business_name,
      };
      return next();
    }

    // Fallback standard dev session
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    let profile = await db.getProfile(defaultUserId);
    if (!profile) {
      profile = await db.upsertProfile({
        id: defaultUserId,
        email: 'freelancer@dueflow.in',
        full_name: 'DueFlow User',
        business_name: 'Studio',
      });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      business_name: profile.business_name,
    };
    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
