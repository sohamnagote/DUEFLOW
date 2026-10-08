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
if (
  config.SUPABASE_URL && 
  !config.SUPABASE_URL.includes('your-project') &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_ANON_KEY.includes('your_key')
) {
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
    // Verify JWT with Supabase Admin or Supabase Client
    const supabaseAdmin = db.getSupabaseAdmin();
    const verifier = supabaseAdmin || supabaseClient;
    if (verifier) {
      const { data: { user }, error } = await verifier.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          business_name: user.user_metadata?.business_name || '',
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Invalid or expired authentication session' });


  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
