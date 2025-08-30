// src/components/auth-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, firestore, firebaseEnabled } from '@/lib/firebase';
import { CentseiLoader } from './centsei-loader';
import type { Entry, Goal, Birthday } from '@/lib/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isGuest: false,
    continueAsGuest: () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const guestMode = localStorage.getItem("centsei_guest_mode") === "true";
      setIsGuest(guestMode);
    } catch {}
    
    if (!firebaseEnabled || !auth) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsGuest(false);
        try {
          localStorage.removeItem("centsei_guest_mode");
        } catch {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const continueAsGuest = () => {
    try {
      localStorage.setItem("centsei_guest_mode", "true");
    } catch {}
    setIsGuest(true);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    if (!firebaseEnabled || !auth || !googleProvider) {
        console.info('Firebase not initialized for sign-in.');
        return;
    }
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
       try {
        localStorage.removeItem("centsei_guest_mode");
       } catch {}
       setIsGuest(false);
    } catch (error) {
      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (firebaseEnabled && auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.error("Error during sign-out:", error);
    } finally {
      // For both guest and signed-in users, reset state and go to login.
      setUser(null);
      setIsGuest(false);
      try {
        localStorage.removeItem("centsei_guest_mode");
      } catch {}
      router.push('/login');
    }
  };

  const value = useMemo(() => ({ user, loading, isGuest, continueAsGuest, signInWithGoogle, signOut }), [user, loading, isGuest]);

  if (loading) {
      return <CentseiLoader isAuthLoading={true} />;
  }

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
