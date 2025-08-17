// src/ai/genkit.ts
/**
 * @fileoverview This file defines the global Genkit instance for the application.
 * It should be used by Genkit tooling but not imported directly by other flows.
 * Flows should be self-contained to ensure stability in the Next.js runtime.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
