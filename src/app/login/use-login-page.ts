
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

export function useLoginPage() {
  const { user, signInWithGoogle, loading: authLoading, continueAsGuest: authContinueAsGuest, isGuest } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Determine the initial loading state.
    // We are loading if auth is still loading and we don't have a user or guest status determined.
    setIsLoading(authLoading || (!user && !isGuest));
    
    // If auth is done loading and we have a user or are a guest, redirect.
    if (!authLoading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, authLoading, router]);
  
  const handleContinueAsGuest = () => {
    authContinueAsGuest();
    // The useEffect will handle the redirect once isGuest becomes true.
  };

  return {
    isLoading,
    signInWithGoogle,
    continueAsGuest: handleContinueAsGuest,
  };
}
