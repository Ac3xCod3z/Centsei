

"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Entry, CategoryDisplayPreference, BillCategory } from "@/lib/types";
import { BillCategories, RecurrenceOptions, CategoryEmojis } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import useLocalStorage from "@/hooks/use-local-storage";
import { parseDateInTimezone } from "@/lib/time";
import { Separator } from "./ui/separator";
import { Label } from "@/components/ui/label";


const formSchema = z.object({
  type: z.enum(["bill", "income"], { required_error: "You need to select an entry type." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  date: z.date({ required_error: "A date is required." }),
  recurrence: z.enum(RecurrenceOptions),
  recurrenceEndDate: z.date().optional().nullable(),
  recurrenceCount: z.coerce.number().optional().nullable(),
  category: z.enum(BillCategories).optional(),
  isPaid: z.boolean().optional(),
  isAutoPay: z.boolean().optional(),
});

type EntryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string }) => void;
  onDelete?: (id: string) => void;
  onCopy?: (entry: Entry) => void;
  entry: Entry | null;
  selectedDate: Date;
  timezone: string;
};

function getOriginalIdFromInstance(key: string) {
  // If it ends with "-YYYY-MM-DD", strip the date
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}


export function EntryDialog({ isOpen, onClose, onSave, onDelete, onCopy, entry, selectedDate, timezone }: EntryFormProps) {
  const [categoryDisplay] = useLocalStorage<CategoryDisplayPreference>('centseiCategoryDisplay', 'text');
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'on' | 'after'>('never');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const entryType = form.watch("type");
  const recurrenceType = form.watch("recurrence");
  const isAutoPay = form.watch("isAutoPay");

   React.useEffect(() => {
    if (isOpen) {
      const isNew = !entry;
      const isCopy = entry && !entry.id;
      
      let initialValues: z.infer<typeof formSchema> = {
        type: "bill",
        name: "",
        amount: "" as any,
        date: selectedDate,
        recurrence: 'none',
        recurrenceEndDate: null,
        recurrenceCount: null,
        category: undefined,
        isPaid: false,
        isAutoPay: false,
      };

      if (entry) {
        initialValues = {
            ...initialValues,
            type: entry.type || "bill",
            name: entry.name || "",
            amount: entry.amount || ('' as any),
            date: isCopy ? selectedDate : parseDateInTimezone(entry.date, timezone),
            recurrence: entry.recurrence || 'none',
            recurrenceEndDate: entry.recurrenceEndDate ? parseDateInTimezone(entry.recurrenceEndDate, timezone) : null,
            recurrenceCount: entry.recurrenceCount || null,
            category: entry.category as BillCategory | undefined,
            isPaid: isCopy ? false : entry.isPaid ?? false,
            isAutoPay: entry.isAutoPay || false,
        };
      }
      
      form.reset(initialValues);

      if (entry?.recurrenceEndDate) {
        setRecurrenceEndType('on');
      } else if (entry?.recurrenceCount) {
        setRecurrenceEndType('after');
      } else {
        setRecurrenceEndType('never');
      }
    }
  }, [isOpen, entry, selectedDate, timezone, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
      ...values,
      originalDate: entry?.date, // Pass the specific date of the instance being edited
    };
    
    if (values.type !== 'bill') {
      dataToSave.category = undefined;
    }

    if (recurrenceEndType === 'never') {
      dataToSave.recurrenceEndDate = undefined;
      dataToSave.recurrenceCount = undefined;
    } else if (recurrenceEndType === 'on') {
      dataToSave.recurrenceCount = undefined;
      // Do not format here, keep it as a Date object for the parent
    } else if (recurrenceEndType === 'after') {
      dataToSave.recurrenceEndDate = undefined;
    }

    if (entry && entry.id) {
      // The ID passed back is the ID of the original master entry
      const originalId = getOriginalIdFromInstance(entry.id);
      onSave({ ...dataToSave, id: originalId });
    } else {
      // New entry or a copy (which has no id)
      onSave({ ...dataToSave, id: undefined });
    }
    // We no longer close the dialog here, as the parent will handle it
    // after the confirmation dialog (if any).
    // onClose();
  }
  
  const handleDelete = () => {
    if (entry && entry.id && onDelete) {
        onDelete(entry.id);
        onClose();
    }
  }

  const handleCopy = () => {
    if (entry && onCopy) {
      onCopy(entry);
    }
  }

  const isEditing = entry && entry.id;

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Entry" : "Add New Entry"}</DialogTitle>
            <DialogDescription>
                {isEditing ? "Update the details of your financial entry." : "Add a new bill or income to your calendar."}
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Entry Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="bill" />
                            </FormControl>
                            <FormLabel className="font-normal">Bill</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="income" />
                            </FormControl>
                            <FormLabel className="font-normal">Income</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Name / Source</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Rent, Paycheck" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {(entryType === 'bill') && (
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                               <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {BillCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                               {categoryDisplay === 'emoji' ? (
                                    <span className="flex items-center gap-2">
                                        {CategoryEmojis[cat]}
                                        <span className="capitalize">{cat}</span>
                                    </span>
                                ) : (
                                    <span className="capitalize">{cat}</span>
                                )}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                )}

                <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
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
                <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a recurrence interval" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="bimonthly">Every 2 months</SelectItem>
                            <SelectItem value="3months">Every 3 months</SelectItem>
                            <SelectItem value="6months">Every 6 months</SelectItem>
                            <SelectItem value="12months">Annually</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                {recurrenceType && recurrenceType !== 'none' && (
                    <div className="space-y-4 rounded-md border p-4">
                        <h4 className="text-sm font-medium">End Recurrence</h4>
                        <RadioGroup value={recurrenceEndType} onValueChange={(value) => setRecurrenceEndType(value as 'never' | 'on' | 'after')}>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="never" id="r-never" />
                                <Label htmlFor="r-never">Never</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="on" id="r-on" />
                                <Label htmlFor="r-on">On date</Label>
                            </div>
                            {recurrenceEndType === 'on' && (
                                <FormField
                                    control={form.control}
                                    name="recurrenceEndDate"
                                    render={({ field }) => (
                                        <FormItem className="pl-6 pt-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                    variant={"outline"}
                                                    className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                                    {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="after" id="r-after" />
                                <Label htmlFor="r-after">After</Label>
                            </div>
                             {recurrenceEndType === 'after' && (
                                <FormField
                                    control={form.control}
                                    name="recurrenceCount"
                                    render={({ field }) => (
                                        <FormItem className="pl-6 pt-2 flex items-center gap-2">
                                             <FormControl>
                                                <Input type="number" className="w-20" placeholder="12" {...field} />
                                             </FormControl>
                                             <Label>occurrences</Label>
                                            <FormMessage className="ml-4"/>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </RadioGroup>
                    </div>
                )}


                {entryType && (
                  <FormField
                    control={form.control}
                    name="isAutoPay"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Set up as Auto-{entryType === 'bill' ? 'Pay' : 'Deposit'}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as {entryType === 'bill' ? 'Paid' : 'Received'}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4 sm:justify-between flex-wrap">
                    <div className="flex gap-2 justify-start">
                        {isEditing && (
                            <>
                                {onCopy && (
                                    <Button type="button" variant="outline" onClick={handleCopy} size="icon">
                                        <Copy className="h-4 w-4" />
                                        <span className="sr-only">Copy</span>
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button type="button" variant="destructive" onClick={handleDelete} size="icon">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}
