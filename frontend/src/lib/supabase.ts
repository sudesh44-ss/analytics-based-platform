import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    !url.includes('placeholder') &&
    !anonKey.includes('placeholder') &&
    url.startsWith('http')
  );
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

export async function getActiveSessionToken(): Promise<string | null> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    // If Supabase is unconfigured, fallback to localStorage or dev-token in development
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sitescope_auth_token');
      if (stored) return stored;
      if (process.env.NODE_ENV === 'development') {
        return 'dev-token';
      }
      return null;
    }
    return process.env.NODE_ENV === 'development' ? 'dev-token' : null;
  }

  try {
    // 1. Check existing session in memory/cookies
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error || !session) {
      // If no active session exists, check fallback token
      if (typeof window !== 'undefined') {
        return localStorage.getItem('sitescope_auth_token') || null;
      }
      return null;
    }

    // 2. Check if token is expired or expiring within 60 seconds
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    if (expiresAt > 0 && expiresAt - now < 60) {
      // Proactively refresh session
      const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
      if (!refreshError && refreshed.session) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sitescope_auth_token', refreshed.session.access_token);
        }
        return refreshed.session.access_token;
      }
    }

    // Cache current valid access token to localStorage for synchronous fallbacks
    if (typeof window !== 'undefined' && session.access_token) {
      localStorage.setItem('sitescope_auth_token', session.access_token);
    }

    return session.access_token;
  } catch {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sitescope_auth_token') || null;
    }
    return null;
  }
}
