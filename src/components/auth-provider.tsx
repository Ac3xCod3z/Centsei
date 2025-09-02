// src/components/auth-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, firestore, firebaseEnabled } from '@/lib/firebase';
import { CentseiLoader } from './centsei-loader';
import type { Entry, Goal, Birthday } from '@/lib/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => {},
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
        setLoading(false);
        // Maybe render a "service unavailable" screen
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!firebaseEnabled || !auth || !googleProvider) {
        console.error('Firebase not initialized for sign-in.');
        return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error during sign-in:", error);
      // Fallback to redirect for environments where popups are blocked
      await signInWithRedirect(auth, googleProvider);
    }
  };

  const signOut = async () => {
    // Put the app into a loading state so consumers don't render with stale user.
    setLoading(true);
    try {
      if (firebaseEnabled && auth && auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      // Never let sign-out errors crash the app; just log and continue.
      console.error("Error during sign-out:", error);
    } finally {
      try {
        // Clear user-scoped local state to avoid cross-account leaks.
        if (typeof window !== 'undefined') {
          const keys = [
            'centseiActiveCalendarId',
            'centseiNotificationsEnabled',
            'centseiCalendarId',
            'centseiRollover',
            'centseiTimezone',
            'centseiBudgetScoreHistory',
            'centseiLastWelcome',
            'centseiInitialBalance',
          ];
          keys.forEach((k) => {
            try { localStorage.removeItem(k); } catch {}
          });
        }
      } catch {}
      setUser(null);
      setLoading(false);
      // Prefer a replace to prevent navigating "back" into an authed screen.
      try {
        router.replace('/login');
      } catch {
        // As a hard fallback, force a full page reload to the login page.
        if (typeof window !== 'undefined') window.location.replace('/login');
      }
    }
  };

  const value = useMemo(() => ({ user, loading, signInWithGoogle, signOut }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
