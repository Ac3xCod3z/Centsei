// src/components/birthdays-dialog.tsx

"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { Plus, Trash2, Edit, Cake } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import type { Birthday } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const birthdayFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  date: z.string().regex(/^\d{2}-\d{2}$/, "Date must be in MM-DD format."),
  budget: z.coerce.number().min(0, "Budget can't be negative.").optional(),
});

type BirthdayFormValues = z.infer<typeof birthdayFormSchema>;

interface BirthdaysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
  onSaveBirthday: (birthday: Omit<Birthday, 'id'> & { id?: string }) => void;
  onDeleteBirthday: (id: string) => void;
}

export function BirthdaysDialog({ isOpen, onClose, birthdays, onSaveBirthday, onDeleteBirthday }: BirthdaysDialogProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [birthdayToDelete, setBirthdayToDelete] = useState<string | null>(null);

  const form = useForm<BirthdayFormValues>({
    resolver: zodResolver(birthdayFormSchema),
    defaultValues: { name: '', date: '', budget: 50 },
  });

  React.useEffect(() => {
    if (editingBirthday) {
      form.reset({
        name: editingBirthday.name,
        date: editingBirthday.date,
        budget: editingBirthday.budget || 50,
      });
      setFormOpen(true);
    } else {
      form.reset({ name: '', date: '', budget: 50 });
    }
  }, [editingBirthday, form]);

  const handleOpenForm = (birthday: Birthday | null = null) => {
    setEditingBirthday(birthday);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingBirthday(null);
    setFormOpen(false);
  };

  const onSubmit = (values: BirthdayFormValues) => {
    onSaveBirthday({
      id: editingBirthday?.id,
      ...values,
    });
    handleCloseForm();
  };

  const sortedBirthdays = [...birthdays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Birthdays</DialogTitle>
            <DialogDescription>
              Add birthdays to get personalized spending forecasts for gifts and parties.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {sortedBirthdays.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No birthdays added yet.</p>
                </div>
              )}
              {sortedBirthdays.map(bday => (
                <div key={bday.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Cake className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold">{bday.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(parse(bday.date, 'MM-dd', new Date()), 'MMMM d')}
                        {bday.budget ? ` - ${formatCurrency(bday.budget)} budget` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(bday)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setBirthdayToDelete(bday.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" /> Add Birthday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBirthday ? 'Edit Birthday' : 'Add a Birthday'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mom's Birthday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input placeholder="MM-DD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gift/Party Budget (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleCloseForm}>Cancel</Button>
                <Button type="submit">{editingBirthday ? 'Save Changes' : 'Add Birthday'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!birthdayToDelete} onOpenChange={() => setBirthdayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this birthday from your forecast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBirthdayToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (birthdayToDelete) {
                  onDeleteBirthday(birthdayToDelete);
                  setBirthdayToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
