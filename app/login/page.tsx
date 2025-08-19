"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    if (!loading && user && profile) {
      // Si hay un parámetro redirect en la URL, usar ese
      if (redirect) {
        console.log("🔄 Redirigiendo a:", redirect);
        router.push(redirect);
      } else {
        console.log("🔄 Redirigiendo al dashboard");
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, redirect, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LoginForm />;
}
