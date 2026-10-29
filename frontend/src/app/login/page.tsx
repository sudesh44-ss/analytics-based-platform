'use client';

import { Suspense } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { GoogleAuthCard } from '../../components/auth/GoogleAuthCard';

function LoginFallback() {
  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '60px 20px 100px' }}>
      <div className="card" style={{ padding: '36px', textAlign: 'center', minHeight: '320px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading sign-in...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<LoginFallback />}>
          <GoogleAuthCard mode="login" />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
