"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = localStorage.getItem('redirectTo');
      if (redirectTo && redirectTo !== '/login') {
        localStorage.removeItem('redirectTo');
        router.push(redirectTo);
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, router]);

  return <LoginForm />;
}
