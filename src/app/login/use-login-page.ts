
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

export function useLoginPage() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We are loading if auth is still in progress.
    setIsLoading(authLoading);
    
    // If auth is done loading and we have a user, redirect.
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  return {
    isLoading,
    signInWithGoogle,
  };
}
