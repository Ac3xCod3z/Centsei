
// src/app/api/sensei/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { senseiSaysFlow } from '@/ai/flows/sensei-says';
import { SenseiContextSchema, SenseiResponseSchema, type SenseiResponse } from '@/lib/sensei/types';

export const runtime = "nodejs";

const FALLBACK_RESPONSE: SenseiResponse = {
  mantra: "The wise student prepares for all seasons, not just for sunshine.",
  tone: "calm",
  category: "discipline",
  suggested_action: "Review your upcoming month for any large, irregular expenses.",
  insight_tag: "low_data",
  source: 'fallback',
};

// Minimal in-memory rate limiter for this server instance.
const requests = new Map<string, { count: number, lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_COUNT = 15; // 15 requests per minute per IP

function isRateLimited(ip: string | null): boolean {
    if (!ip) {
        // Deny requests without an IP
        return true;
    }
    const now = Date.now();
    const userData = requests.get(ip);

    if (!userData || now - userData.lastRequest > RATE_LIMIT_WINDOW) {
        requests.set(ip, { count: 1, lastRequest: now });
        return false;
    }
    
    if (userData.count >= RATE_LIMIT_COUNT) {
        return true;
    }

    userData.count++;
    userData.lastRequest = now;
    return false;
}

function okJson(body: unknown, source: 'provider' | 'fallback' | 'cache') {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: { 
        "Content-Type": "application/json",
        "X-Sensei-Source": source,
     },
  });
}

function errJson(body: unknown, status: number = 400) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function callAIWithTimeoutAndRetry(context: any, timeout = 8000, retries = 1, backoff = 1000): Promise<SenseiResponse> {
    for (let i = 0; i <= retries; i++) {
        try {
            const result = await Promise.race([
                senseiSaysFlow(context),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
            ]);
            
            const validatedResponse = SenseiResponseSchema.safeParse(result);
            if(validatedResponse.success) {
                return { ...validatedResponse.data, source: 'provider' };
            }
            // Schema validation failed, treat as an error to trigger retry/fallback
            throw new Error("AI response failed schema validation");
        } catch (err: any) {
            console.error(`AI call attempt ${i + 1} failed:`, err.message);
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
            }
        }
    }
    // If all retries fail, return the fallback
    console.error("All AI call attempts failed. Returning fallback.");
    return FALLBACK_RESPONSE;
}


export async function POST(req: NextRequest) {
  // Securely log API key presence for debugging
  if (process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY is configured on the server.");
  } else {
    console.error("CRITICAL: GEMINI_API_KEY is not set on the server!");
  }
  
  const ip = req.ip ?? req.headers.get('x-forwarded-for');
  if (isRateLimited(ip)) {
      return errJson({ error: "Too many requests" }, 429);
  }

  try {
    const requestBody = await req.json();
    const parsedContext = SenseiContextSchema.safeParse(requestBody.context);
    
    if (!parsedContext.success) {
      console.error("Invalid context received:", parsedContext.error.flatten());
      return errJson({ error: "Invalid context provided", details: parsedContext.error.flatten() }, 400);
    }

    const response = await callAIWithTimeoutAndRetry(parsedContext.data);
    return okJson(response, response.source as 'provider' | 'fallback');

  } catch (e: any) {
    console.error("Error in /api/sensei:", e);
    // This is the final catch-all. If anything in the main logic fails, return the fallback.
    // This prevents a 500 server crash.
    return okJson(FALLBACK_RESPONSE, 'fallback');
  }
}
