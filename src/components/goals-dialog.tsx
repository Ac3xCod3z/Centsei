

"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Edit, CalendarIcon, Target, Check, Trophy } from 'lucide-react';
import JSConfetti from 'js-confetti';

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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import type { Goal } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
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


const goalFormSchema = z.object({
  name: z.string().min(2, { message: "Goal name must be at least 2 characters." }),
  targetAmount: z.coerce.number().positive({ message: "Target must be a positive number." }),
  savedAmount: z.coerce.number().min(0, { message: "Saved amount cannot be negative." }).optional(),
  targetDate: z.date().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  onSaveGoal: (goal: Omit<Goal, 'id'> & { id?: string }) => void;
  onDeleteGoal: (id: string) => void;
}

export function GoalsDialog({ isOpen, onClose, goals, onSaveGoal, onDeleteGoal }: GoalsDialogProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { toast } = useToast();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { name: '', targetAmount: 1000, savedAmount: 0 },
  });

  React.useEffect(() => {
    if (editingGoal) {
      form.reset({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        savedAmount: editingGoal.savedAmount,
        targetDate: editingGoal.targetDate ? parseISO(editingGoal.targetDate) : undefined,
      });
      setFormOpen(true);
    } else {
      form.reset({ name: '', targetAmount: 1000, savedAmount: 0, targetDate: undefined });
    }
  }, [editingGoal, form]);

  const handleOpenForm = (goal: Goal | null = null) => {
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingGoal(null);
    setFormOpen(false);
  };

  const onSubmit = (values: GoalFormValues) => {
    const previousSavedAmount = editingGoal?.savedAmount ?? 0;
    
    onSaveGoal({
      id: editingGoal?.id,
      ...values,
      savedAmount: values.savedAmount || 0,
      targetDate: values.targetDate ? format(values.targetDate, 'yyyy-MM-dd') : undefined,
    });
    
    if (values.savedAmount && values.savedAmount > previousSavedAmount) {
       const progress = (values.savedAmount / values.targetAmount) * 100;
       const prevProgress = (previousSavedAmount / values.targetAmount) * 100;
       
       if (progress >= 100 && prevProgress < 100) {
            toast({
                title: "Goal Achieved! 🎉",
                description: `Congratulations on reaching your goal: ${values.name}`,
            });
            const confetti = new JSConfetti();
            confetti.addConfetti({
                confettiNumber: 200,
                emojiSize: 100,
                emojis: ['🏆', '💰', '✨', '🎉'],
            });
       }
    }
    
    handleCloseForm();
  };

  const sortedGoals = [...goals].sort((a, b) => {
    const aProgress = (a.savedAmount / a.targetAmount) * 100;
    const bProgress = (b.savedAmount / b.targetAmount) * 100;
    if (aProgress === 100 && bProgress !== 100) return 1;
    if (bProgress === 100 && aProgress !== 100) return -1;
    return (b.savedAmount / b.targetAmount) - (a.savedAmount / a.targetAmount);
  });
  
  if (!isOpen) {
      return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Your Zen Savings</DialogTitle>
            <DialogDescription>
              Set, track, and conquer your financial goals.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
                {sortedGoals.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No goals yet. Start your journey!</p>
                    </div>
                )}
                {sortedGoals.map(goal => {
                    const progress = (goal.savedAmount / goal.targetAmount) * 100;
                    return (
                        <div key={goal.id} className="p-4 border rounded-lg space-y-3 bg-secondary/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{goal.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(goal)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setGoalToDelete(goal.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                             <Progress value={progress} />
                            {goal.targetDate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" /> Target: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" /> New Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create a New Goal'}</DialogTitle>
            <DialogDescription>
                Define your target and track your progress.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Goal Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., New Car, Vacation Fund" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="targetAmount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Target Amount</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="1000" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="savedAmount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Currently Saved</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Target Date (Optional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleCloseForm}>Cancel</Button>
                    <Button type="submit">{editingGoal ? 'Save Changes' : 'Create Goal'}</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this savings goal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGoalToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => {
                    if (goalToDelete) {
                        onDeleteGoal(goalToDelete);
                        setGoalToDelete(null);
                    }
                }}
                className="bg-destructive hover:bg-destructive/90"
            >
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
