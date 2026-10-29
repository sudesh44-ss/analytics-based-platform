'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Activity, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../../lib/supabase';
import styles from './AuthCard.module.css';

interface GoogleAuthCardProps {
  mode: 'login' | 'register';
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleAuthCard({ mode }: GoogleAuthCardProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLogin = mode === 'login';

  // Surface any error passed back from OAuth redirect query parameters without causing cascading renders
  const urlError = searchParams.get('error_description') || searchParams.get('error');
  const activeError = errorMessage || (urlError ? decodeURIComponent(urlError) : null);

  const handleGoogleSignIn = async () => {
    // Prevent duplicate OAuth requests while one is already in-flight
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Verify Supabase provider configuration is available
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        'Google OAuth provider configuration is pending. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment, and ensure Google OAuth is enabled in your Supabase dashboard.'
      );
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage('Failed to initialize Supabase client. Please check your configuration.');
      setIsLoading(false);
      return;
    }

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextParam = searchParams.get('next');
      const redirectTo = `${origin}/auth/callback${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
      // If successful, Supabase initiates browser redirect to Google identity screen
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during Google sign-in.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.cardWrapper}>
      <div className={styles.authCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoIcon}>
            <Activity size={22} />
          </div>
          <h1 className={styles.title}>
            {isLogin ? 'Sign In to SiteScope' : 'Create your SiteScope account'}
          </h1>
          <p className={styles.subtitle}>
            {isLogin
              ? 'Access your audited websites, reports, and SEO diagnostics.'
              : 'Get started with website analytics, SEO audits, and performance monitoring.'}
          </p>
        </div>

        {/* Error State Banner */}
        {activeError && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{activeError}</span>
          </div>
        )}

        {/* Prominent Google Sign-In / Sign-Up Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={styles.googleBtn}
          aria-label={isLogin ? 'Continue with Google' : 'Sign up with Google'}
        >
          <span className={styles.googleIconWrapper}>
            {isLoading ? (
              <Loader2 size={18} className={styles.spinner} color="var(--primary)" />
            ) : (
              <GoogleLogo />
            )}
          </span>
          <span className={styles.btnText}>
            {isLoading
              ? 'Connecting to Google...'
              : isLogin
              ? 'Continue with Google'
              : 'Sign up with Google'}
          </span>
        </button>

        <div className={styles.securityNote}>
          <ShieldCheck size={14} color="var(--success)" />
          <span>Secured via Google Identity & Supabase Auth</span>
        </div>

        {/* Subtle Divider */}
        <div className={styles.divider} />

        {/* Bottom Switch Link */}
        <div className={styles.footer}>
          {isLogin ? (
            <span>
              Don&apos;t have an account?
              <Link href="/register" className={styles.footerLink}>
                Create an account
              </Link>
            </span>
          ) : (
            <span>
              Already have an account?
              <Link href="/login" className={styles.footerLink}>
                Sign in
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
