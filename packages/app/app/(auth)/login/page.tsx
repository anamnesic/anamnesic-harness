'use client';

import { Login } from '@/src/screens/Login';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
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
