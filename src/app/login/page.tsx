// src/app/login/page.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CentseiLoader } from '@/components/centsei-loader';
import { useLoginPage } from './use-login-page';

export default function LoginPage() {
  const { 
    isLoading, 
    signInWithGoogle, 
    continueAsGuest 
  } = useLoginPage();

  if (isLoading) {
    return <CentseiLoader isAuthLoading />;
  }
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-6 rounded-xl border bg-card shadow-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Image src="/CentseiLogo.png" alt="Centsei" width={140} height={46} style={{ height: 'auto' }} />
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

          <Button variant="outline" className="w-full" onClick={continueAsGuest}>
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
