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
    if (!loading && user) {
      const destination = redirect || "/recipes";
      console.log("🔄 Usuario autenticado. Redirigiendo a:", destination, "Perfil cargado:", !!profile);
      router.replace(destination);
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
