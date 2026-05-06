'use client';

import { Signup } from '@/src/screens/Signup';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  return (
    <Signup onBackToLogin={() => router.push('/login')} />
  );
}
