// src/ai/flows/rollover-optimization.ts
'use server';

/**
 * @fileOverview A flow for providing AI-powered rollover preference recommendations.
 * This flow is self-contained and does not rely on a global genkit instance.
 * - getRolloverRecommendation - A function that provides a rollover recommendation based on user input.
 * - RolloverOptimizationInput - The input type for the getRolloverRecommendation function.
 * - RolloverOptimizationOutput - The return type for the getRolloverRecommendation function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Initialize Genkit and the Google AI plugin within the flow file for stability.
const ai = genkit({
    plugins: [googleAI()],
});

const RolloverOptimizationInputSchema = z.object({
  incomeLevel: z
    .number()
    .describe('The users monthly income level.'),
  financialGoals: z
    .string()
    .describe(
      'The users financial goals, e.g., saving for a house, paying off debt.'
    ),
});
export type RolloverOptimizationInput = z.infer<
  typeof RolloverOptimizationInputSchema
>;

const RolloverOptimizationOutputSchema = z.object({
  recommendation: z
    .string()
    .describe(
      'The recommended rollover strategy (carryover vs. reset) and reasoning.'
    ),
});
export type RolloverOptimizationOutput = z.infer<
  typeof RolloverOptimizationOutputSchema
>;

const rolloverOptimizationFlow = ai.defineFlow(
  {
    name: 'rolloverOptimizationFlow',
    inputSchema: RolloverOptimizationInputSchema,
    outputSchema: RolloverOptimizationOutputSchema,
  },
  async (input) => {
    const prompt = `You are a financial advisor providing advice on rollover preferences for a budgeting application.

  Based on the user's income level and financial goals, recommend an optimal rollover strategy (carryover vs. reset).
  Explain your reasoning for the recommendation.

  Income Level: ${input.incomeLevel}
  Financial Goals: ${input.financialGoals}`;

    const { output } = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-1.5-flash',
        config: {
            temperature: 0.5,
        },
        output: {
            schema: RolloverOptimizationOutputSchema,
        },
    });
    
    return output!;
  }
);

export async function getRolloverRecommendation(
  input: RolloverOptimizationInput
): Promise<RolloverOptimizationOutput> {
  return await rolloverOptimizationFlow(input);
}
