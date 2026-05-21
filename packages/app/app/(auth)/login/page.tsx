'use client';

import { Suspense } from 'react';
import { Login } from '@/src/screens/Login';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      router.replace(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  return (
    <Login onNavigateToSignup={() => router.push('/signup')} />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
