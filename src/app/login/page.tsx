
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { enableLocalMode, disableLocalMode } from '@/lib/local-mode';

export default function LoginPage() {
  const router = useRouter();

  // If already signed in, go home
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/');
    });
    return () => unsub();
  }, [router]);

  const signInWithGoogle = async () => {
    try {
      if (!auth) return;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      disableLocalMode();          // prefer cloud mode after login
      router.replace('/');
    } catch (err) {
      console.error('Google sign-in failed', err);
      // Optionally show a toast
    }
  };

  const useWithoutAccount = () => {
    enableLocalMode();             // opt into offline/local mode
    router.replace('/');           // go to dashboard without auth
  };

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

          <Button variant="outline" className="w-full" onClick={useWithoutAccount}>
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
