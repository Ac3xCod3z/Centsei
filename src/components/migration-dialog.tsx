
// src/components/migration-dialog.tsx
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Entry, Goal, Birthday } from '@/lib/types';
import type { User } from 'firebase/auth';
import { firestore } from '@/lib/firebase';
import { writeBatch, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  localData: {
    entries: Entry[];
    goals: Goal[];
    birthdays: Birthday[];
  };
  user: User;
}

export function MigrationDialog({ isOpen, onClose, localData, user }: MigrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMerge = async () => {
    if (!firestore) {
        toast({
            title: "Connection Error",
            description: "Cannot migrate data, not connected to the database.",
            variant: "destructive"
        });
        return;
    }
    setIsLoading(true);
    try {
      const batch = writeBatch(firestore);

      // Add entries
      localData.entries.forEach(entry => {
        const docRef = doc(collection(firestore, 'users', user.uid, 'calendar_entries'));
        batch.set(docRef, { ...entry, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      });

      // Add goals
      localData.goals.forEach(goal => {
        const docRef = doc(collection(firestore, 'users', user.uid, 'goals'));
        batch.set(docRef, { ...goal, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      });

      // Add birthdays
      localData.birthdays.forEach(birthday => {
        const docRef = doc(collection(firestore, 'users', user.uid, 'birthdays'));
        batch.set(docRef, { ...birthday, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      });
      
      // Mark migration as done
      const userProfileRef = doc(firestore, 'users', user.uid);
      batch.set(userProfileRef, { migration_done: true }, { merge: true });

      await batch.commit();

      // Clear local storage
      localStorage.removeItem('centseiEntries');
      localStorage.removeItem('centseiGoals');
      localStorage.removeItem('centseiBirthdays');
      
      toast({
        title: "Migration Complete!",
        description: "Your local data has been securely saved to your account.",
      });

      onClose();

    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        title: "Migration Failed",
        description: "There was an error moving your data. Please try again or skip for now.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
      if (!firestore) return;
      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDoc(userProfileRef, { migration_done: true }, { merge: true });
      onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to the Cloud Dojo!</DialogTitle>
          <DialogDescription>
            We've found existing data on this device. Would you like to merge it into your new Centsei account?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert>
            <AlertTitle>Data Found on This Device</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {localData.entries.length > 0 && <li>{localData.entries.length} Calendar Entries</li>}
                {localData.goals.length > 0 && <li>{localData.goals.length} Savings Goals</li>}
                {localData.birthdays.length > 0 && <li>{localData.birthdays.length} Birthdays</li>}
              </ul>
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Merging will securely save this data to your account, making it available on all your devices. Skipping will keep this data on this device only.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button onClick={handleMerge} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Import & Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
