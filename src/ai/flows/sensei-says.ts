// src/ai/flows/sensei-says.ts
'use server';

/**
 * @fileOverview A flow for generating a financial mantra.
 * This flow is self-contained and does not rely on a global genkit instance.
 * - senseiSaysFlow - A function that generates a mantra based on user's financial context.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { SenseiContextSchema, SenseiResponseSchema } from '@/lib/sensei/types';
import { z } from 'zod';

// Initialize Genkit and the Google AI plugin within the flow file for stability.
const ai = genkit({
    plugins: [googleAI()],
});

const SENSEI_SYSTEM_PROMPT = `You are a calm financial sensei. Speak briefly. One sentence mantra only. Avoid repetition. Reflect the user's current financial context (score, belt, weekly net flow, upcoming events, goals, streaks). Encourage discipline without shame. Output valid JSON.`;

const senseiSaysAIFlow = ai.defineFlow(
    {
      name: 'senseiSaysAIFlow',
      inputSchema: SenseiContextSchema,
      outputSchema: SenseiResponseSchema,
    },
    async (input) => {
        const prompt = `
          User's Financial Context:
          - Budget Health Score: ${input.budget_health_score}
          - Dojo Rank: "${input.dojo_rank}"
          - This Week's Net Flow: ${input.week_net_flow}
          - Upcoming Seasonal Events (next 30 days): 
            ${input.seasonal_events_next_30d?.map(e => `- ${e.name} on ${e.date} (expected spend: ${e.expected_spend})`).join('\n') || '- None'}
          - Savings Goals:
            ${input.goals_summary?.map(g => `- "${g.name}" is ${g.pct_to_target}% complete.`).join('\n') || '- No active goals.'}
        `;

        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            system: SENSEI_SYSTEM_PROMPT,
            prompt: prompt,
            config: {
                temperature: 0.7,
            },
            output: {
                schema: SenseiResponseSchema,
            },
        });
        
        return output!;
    }
);

export async function senseiSaysFlow(input: z.infer<typeof SenseiContextSchema>): Promise<z.infer<typeof SenseiResponseSchema>> {
    return await senseiSaysAIFlow(input);
}
