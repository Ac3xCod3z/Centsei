// src/ai/genkit.ts
/**
 * @fileoverview This file defines the global Genkit instance for the application.
 * It should be used by all flows and Genkit-related code.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
