// src/components/auth-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, firestore } from '@/lib/firebase';
import { CentseiLoader } from './centsei-loader';
import type { Entry, Goal, Birthday } from '@/lib/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isGuest: false,
    continueAsGuest: () => {},
    exitGuest: () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [localData, setLocalData] = useState<{ entries: Entry[], goals: Goal[], birthdays: Birthday[] } | null>(null);

  useEffect(() => {
    try {
      setIsGuest(typeof window !== "undefined" && localStorage.getItem("centsei_guest") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && firestore) {
        const wasGuest = localStorage.getItem("centsei_guest") === "1";
        if (wasGuest) {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists() || !userDoc.data()?.migration_done) {
            if (!userDoc.exists()) {
                await setDoc(userDocRef, { email: user.email, displayName: user.displayName, photoURL: user.photoURL, created_at: new Date() }, { merge: true });
            }

            const localEntries = JSON.parse(localStorage.getItem('centseiEntries') || '[]');
            const localGoals = JSON.parse(localStorage.getItem('centseiGoals') || '[]');
            const localBirthdays = JSON.parse(localStorage.getItem('centseiBirthdays') || '[]');
            
            if (localEntries.length > 0 || localGoals.length > 0 || localBirthdays.length > 0) {
                setLocalData({ entries: localEntries, goals: localGoals, birthdays: localBirthdays });
                setShowMigrationDialog(true);
            } else {
                exitGuest();
            }
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const continueAsGuest = () => {
    try {
      localStorage.setItem("centsei_guest", "1");
    } catch {}
    setIsGuest(true);
  };

  const exitGuest = () => {
    try {
      localStorage.removeItem("centsei_guest");
    } catch {}
    setIsGuest(false);
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
        console.error("Firebase not initialized for sign-in.");
        return;
    }
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // After sign-in, the onAuthStateChanged listener will handle the user state update
      // and subsequent component re-renders.
    } catch (error) {
      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) {
        console.error("Firebase not initialized for sign-out.");
        return;
    }
    try {
      await firebaseSignOut(auth);
      exitGuest();
      setUser(null);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  const value = useMemo(() => ({ user, loading, isGuest, continueAsGuest, exitGuest, signInWithGoogle, signOut }), [user, loading, isGuest]);


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
