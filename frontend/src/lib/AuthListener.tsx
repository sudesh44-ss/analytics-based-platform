'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from './supabase';
import { setAuthToken } from './api';

export function AuthListener() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Listen for real-time authentication events (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sitescope_auth_token');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
