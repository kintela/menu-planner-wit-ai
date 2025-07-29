"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function useSession() {
  const { user, profile, loading } = useAuth()

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  }
}

export function useSessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectTo = localStorage.getItem('redirectTo');
    if (redirectTo) {
      localStorage.removeItem('redirectTo');
      router.push(redirectTo);
    }
  }, [router]);
}
