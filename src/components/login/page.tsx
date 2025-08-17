// src/app/login/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CentseiLoader } from '@/components/centsei-loader';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <CentseiLoader isAuthLoading />;
  }
  
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-lg">
        <Image src="/CentseiLogo.png" alt="Centsei Logo" width={150} height={45} className="mx-auto mb-6" style={{ height: 'auto' }} />
        <h1 className="mb-2 text-2xl font-bold">Welcome to Centsei</h1>
        <p className="mb-8 text-muted-foreground">Your personal finance sensei.</p>
        <Button onClick={signInWithGoogle} className="w-full">
          Sign In with Google
        </Button>
      </div>
    </div>
  );
}
