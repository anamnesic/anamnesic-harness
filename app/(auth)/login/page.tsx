'use client';

import { Login } from '@/src/screens/Login';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <Login onNavigateToSignup={() => router.push('/signup')} />
  );
}
