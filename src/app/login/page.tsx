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

        <h1 className="text-xl font-semibold">Welcome to Centsei</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your Google account to begin your journey to financial mastery.
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        </div>
      </div>
    </main>
  );
}
