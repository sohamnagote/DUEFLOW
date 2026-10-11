import { supabase } from './supabase';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '984278420304-vmmqd7o7luioec5vkroapbrqmfpgsohk.apps.googleusercontent.com';

export interface AuthUserProfile {
  email: string;
  name: string;
  avatarUrl?: string;
  id?: string;
  provider?: 'google' | 'email';
}

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Computes an environment-aware post-authentication redirect URL.
 * Always resolves to current origin on local or deployed domains.
 */
export function getDashboardRedirectUrl(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.origin}/`;
}

/**
 * Initiates Google OAuth Sign-In via Supabase Auth with Google provider.
 * Supports account selection prompt ('select_account') for clean account switching.
 * Redirects to the current frontend origin / dashboard route.
 */
export async function signInWithGoogle(prompt: 'select_account' | 'consent' = 'select_account'): Promise<void> {
  if (typeof window === 'undefined') return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getDashboardRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt,
      },
    },
  });
  if (error) throw error;
}

/**
 * Initiates Google sign-in using GIS or Supabase OAuth.
 */
export async function signInWithGooglePopup(prompt: 'select_account' | 'consent' = 'select_account'): Promise<AuthUserProfile | void> {
  // If GIS ID-token client is available, attempt ID token sign-in
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      return await new Promise<AuthUserProfile>((resolve, reject) => {
        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          prompt_parent_id: 'g_id_onload',
          callback: async (response: any) => {
            if (!response.credential) {
              return reject(new Error('No Google credentials returned'));
            }
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
              });
              if (error) throw error;
              if (data?.user) {
                const profile: AuthUserProfile = {
                  id: data.user.id,
                  email: data.user.email || '',
                  name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
                  avatarUrl: data.user.user_metadata?.avatar_url,
                  provider: 'google',
                };
                resolve(profile);
              }
            } catch (err) {
              reject(err);
            }
          },
        });
        window.google!.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fall back directly to Supabase OAuth redirect with prompt
            signInWithGoogle(prompt).catch(reject);
          }
        });
      });
    } catch (_) {
      // Fallback to standard Supabase OAuth
      return signInWithGoogle(prompt);
    }
  }

  // Standard official Supabase OAuth redirect with select_account
  return signInWithGoogle(prompt);
}

/**
 * Signs in using Supabase Auth email and password.
 */
export async function signInWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  if (data?.user) {
    const profile: AuthUserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.full_name || email.split('@')[0],
      provider: 'email',
    };
  }
  return data;
}

/**
 * Creates a new account using Supabase Auth.
 */
export async function signUpWithEmailPassword(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getDashboardRedirectUrl(),
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;

  if (data?.user) {
    const profile: AuthUserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      name: fullName || email.split('@')[0],
      provider: 'email',
    };
  }
  return data;
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/signin`,
  });
  if (error) throw error;
}

/**
 * Signs out current user from all session stores.
 */
export async function signOutUser() {
  try {
    await supabase.auth.signOut();
  } catch (_) {}
}

export async function getActiveUser(): Promise<AuthUserProfile | null> {
  // Check active Supabase session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        avatarUrl: session.user.user_metadata?.avatar_url,
        provider: (session.user.app_metadata?.provider as any) || 'email',
      };
    }
  } catch (_) {}

  return null;
}
