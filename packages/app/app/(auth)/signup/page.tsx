'use client';

import { Signup } from '@/src/screens/Signup';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useEffect } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  return (
    <Signup onBackToLogin={() => router.push('/login')} />
  );
}
