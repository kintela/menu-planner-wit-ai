"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (router.query && router.query.redirectTo) {
      const redirectTo = router.query.redirectTo as string;
      if (redirectTo) {
        localStorage.setItem('redirectTo', redirectTo);
      }
    }
  }, [router.query]);

  return <LoginForm />;
}
