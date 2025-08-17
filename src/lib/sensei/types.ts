
// src/lib/sensei/types.ts
import { z } from "zod";

export const SenseiResponseSchema = z.object({
  mantra: z.string().min(7).max(180),
  tone: z.enum(['calm', 'encouraging', 'direct']),
  category: z.enum([
    'savings',
    'spending',
    'discipline',
    'gratitude',
    'awareness',
  ]),
  suggested_action: z.string().min(3).max(180),
  insight_tag: z.enum([
    'on_track',
    'off_track',
    'event_spike_soon',
    'goal_near',
    'low_data',
  ]),
  source: z.string().optional(), // For debug badge
});
export type SenseiResponse = z.infer<typeof SenseiResponseSchema>;

export const SenseiContextSchema = z.object({
    budget_health_score: z.number(),
    dojo_rank: z.string(),
    week_net_flow: z.number(),
    seasonal_events_next_30d: z.array(z.object({
        date: z.string(),
        name: z.string(),
        expected_spend: z.number(),
    })).optional(),
    goals_summary: z.array(z.object({
        name: z.string(),
        pct_to_target: z.number(),
    })),
});
export type SenseiContext = z.infer<typeof SenseiContextSchema>;
