// src/app/login/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CentseiLoader } from '@/components/centsei-loader';

export default function LoginPage() {
  const { user, signInWithGoogle, loading, continueAsGuest, isGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, loading, router]);
  
  const handleUseWithoutAccount = () => {
    continueAsGuest();
    router.replace('/');
  }

  if (loading || user || isGuest) {
    return <CentseiLoader isAuthLoading />;
  }
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-6 rounded-xl border bg-card shadow-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Image src="/CentseiLogo.png" alt="Centsei" width={140} height={46} />
        </div>

        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to sync across devices — or continue without an account to keep data on this device.
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>

          <div className="text-xs text-muted-foreground">or</div>

          <Button variant="outline" className="w-full" onClick={handleUseWithoutAccount}>
            Use without account (local only)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          You can switch to Google later from Settings to enable sync & backup.
        </p>
      </div>
    </main>
  );
}
