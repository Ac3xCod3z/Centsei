// src/app/login/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CentseiLoader } from '@/components/centsei-loader';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { user, signInWithGoogle, loading, isGuest, continueAsGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, loading, isGuest, router]);

  if (loading || user || isGuest) {
    return <CentseiLoader isAuthLoading />;
  }
  
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-lg space-y-4">
        <Image src="/CentseiLogo.png" alt="Centsei Logo" width={150} height={45} className="mx-auto mb-2" style={{ height: 'auto' }} />
        <h1 className="text-2xl font-bold">Welcome to Centsei</h1>
        <p className="text-muted-foreground !mt-2">Your personal finance sensei.</p>
        
        <Button onClick={signInWithGoogle} className="w-full">
          Sign In with Google
        </Button>
        
        <div className="relative text-center text-xs text-muted-foreground">or</div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            continueAsGuest();
            router.push("/"); // go to dashboard
          }}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Continue without signing in
        </Button>

        <p className="text-xs text-muted-foreground text-center !mt-2">
          Your data will be saved on this device only. You can sign in later to sync and back it up.
        </p>

      </div>
    </div>
  );
}
