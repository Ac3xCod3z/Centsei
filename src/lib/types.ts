// src/lib/types.ts
import { z } from 'zod';

export type EntryType = 'bill' | 'income';

export const BillCategories = [
  "rent",
  "utilities",
  "phone bill",
  "vehicles",
  "loans",
  "credit cards",
  "groceries",
  "day care",
  "subscriptions",
  "recreations",
  "necessities",
  "vices",
  "personal maintenance",
  "other",
] as const;

export const CategoryEmojis: Record<BillCategory, string> = {
  rent: "🏠",
  utilities: "💡",
  "phone bill": "📱",
  vehicles: "🚗",
  loans: "💰",
  "credit cards": "💳",
  groceries: "🛒",
  "day care": "👶",
  subscriptions: "🔄",
  recreations: "🎭",
  necessities: "🛍️",
  vices: "🍸",
  "personal maintenance": "💇‍♀️",
  other: "📦",
};


export type BillCategory = (typeof BillCategories)[number];

export const RecurrenceOptions = [
  'none',
  'weekly',
  'bi-weekly',
  'monthly',
  'bimonthly',
  '3months',
  '6months',
  '12months'
] as const;

export type RecurrenceInterval = typeof RecurrenceOptions[number];
export type CategoryDisplayPreference = 'text' | 'emoji';

export type ISODate = string; // "YYYY-MM-DD" format

export type EntryException = {
  movedTo?: ISODate;
  movedFrom?: ISODate;
  isPaid?: boolean;
  order?: number;
  name?: string;
  amount?: number;
  category?: BillCategory;
};

export const MasterEntrySchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD anchor date
  name: z.string(),
  amount: z.number(),
  type: z.enum(['bill', 'income']),
  recurrence: z.enum(RecurrenceOptions),
  recurrenceEndDate: z.string().optional(),
  recurrenceCount: z.number().optional(),
  category: z.enum(BillCategories).optional(),
  order: z.number().optional(),
  isPaid: z.boolean().optional(),
  isAutoPay: z.boolean().optional(),
  exceptions: z.record(z.custom<EntryException>()).optional(),
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
  source: z.string().optional(),
  content_hash: z.string().optional(),
});

export type MasterEntry = z.infer<typeof MasterEntrySchema>;

// This type represents an instance on the calendar, it may have overrides from an exception
export type Entry = MasterEntry;


export const GoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  savedAmount: z.number(),
  targetDate: z.string().optional(), // YYYY-MM-DD
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
  source: z.string().optional(),
  content_hash: z.string().optional(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const BirthdaySchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(), // MM-DD
  budget: z.number().optional(),
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
  source: z.string().optional(),
  content_hash: z.string().optional(),
});

export type Birthday = z.infer<typeof BirthdaySchema>;

export type Holiday = {
    name: string;
    date: Date;
    uplift: number;
}


export type SelectedInstance = {
  instanceId: string;
  masterId: string;
  date: string;
}

export type RolloverPreference = 'carryover' | 'reset';

export type BudgetScore = {
    score: number;
    date: string; // YYYY-MM-DD
    commentary: string;
}

export type Rank = {
    title: string;
    icon: React.ReactNode;
}

export type DojoRank = {
  level: number;
  name: string;
  belt: {
    name: string;
    color: string;
  };
  stripes: number;
  nextMilestone: number;
  nextRankName: string;
  progress: number;
  balanceToNext: number;
};

export type SeasonalEvent = {
    date: string;
    name: string;
    expected_spend: number;
}
