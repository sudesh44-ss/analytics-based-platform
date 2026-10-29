import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CookieToSet {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2];
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  if (error) {
    const errorMsg = errorDescription || error;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder') &&
      supabaseUrl.startsWith('http')
    ) {
      const cookieStore = await cookies();
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore if called from route handler where headers are already sent
            }
          },
        },
      });

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError && data?.session) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const failureMessage = exchangeError?.message || 'Failed to exchange authorization code for session.';
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(failureMessage)}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No authorization code was provided by the identity provider.')}`
  );
}
