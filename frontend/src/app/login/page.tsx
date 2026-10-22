'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // In production, invokes supabase.auth.signInWithPassword({ email, password })
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/dashboard';
    }, 1000);
  };

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '440px' }}>
        <div className="card" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <Activity size={22} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Sign In to SiteScope</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Access your audited websites, reports, and SEO diagnostics.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
                <Link href="/contact" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            {errorMessage && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--critical-light)', color: 'var(--critical)', fontSize: '13px' }}>
                {errorMessage}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={isLoading}>
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Create an account
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
