

/*
  Centsei — Sensei Says
  Hook + Zod schema + provider wrapper

  Install: npm i zod
  Usage (client):
    const { state, generate, favorites, addFavorite, removeFavorite, copyLast, clearCache } = useSenseiSays();
    await generate(context);

  You provide a backend/edge endpoint at /api/sensei that calls your AI provider.
  This file also exports a helper to build the provider payload and the exact system prompt
  so your server can stay consistent with the client contract.
*/

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { type SenseiContext, type SenseiResponse, SenseiResponseSchema } from "@/lib/sensei/types";
import { type User } from 'firebase/auth';
import { firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';


/*************************
 * Config
 *************************/
const DEFAULT_ENDPOINT = "/api/sensei"; // your server/edge route
const COOLDOWN_MS = 5000; // 5s between requests
const DAILY_CAP = 2;     // max generations per local day
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h cache for last mantra

const LS = {
  last: "centsei.ss.last",
  lastTs: "centsei.ss.last.ts",
  favs: "centsei.ss.favs",
  dayStamp: "centsei.ss.daystamp",
  dayCount: "centsei.ss.daycount",
};

/*************************
 * Fallbacks
 *************************/
const LOCAL_FALLBACK: Omit<SenseiResponse, 'source'> = {
    mantra: "The wise student prepares for all seasons, not just for sunshine.",
    tone: "calm",
    category: "discipline",
    suggested_action: "Review your upcoming month for any large, irregular expenses.",
    insight_tag: "low_data",
};


/*************************
 * Simple utils
 *************************/
function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/*************************
 * Public hook
 *************************/
export interface UseSenseiOptions {
  user: User | null;
  endpoint?: string;
  cooldownMs?: number;
  dailyCap?: number;
  cacheTtlMs?: number;
  onToast?: (msg: string) => void; 
  onTrack?: (event: string, payload?: Record<string, unknown>) => void; 
}

export type UseSenseiSaysReturn = ReturnType<typeof useSenseiSays>;

export function useSenseiSays(opts: UseSenseiOptions) {
  const { user } = opts;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const cooldownMs = opts.cooldownMs ?? COOLDOWN_MS;
  const dailyCap = opts.dailyCap ?? DAILY_CAP;
  const cacheTtlMs = opts.cacheTtlMs ?? CACHE_TTL_MS;
  const toast = opts.onToast ?? (() => {});
  const track = opts.onTrack ?? (() => {});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<SenseiResponse | null>(() => readJSON<SenseiResponse | null>(LS.last, null));
  const [favorites, setFavorites] = useState<SenseiResponse[]>([]);
  const [showFavoritesDialog, setShowFavoritesDialog] = useState(false);
  
  const nextAllowedAtRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  // Sync favorites with Firestore if user is logged in
  useEffect(() => {
    if (!user) {
      setFavorites(readJSON<SenseiResponse[]>(LS.favs, []));
      return;
    }

    const mantrasRef = collection(firestore, 'users', user.uid, 'mantras');
    const q = query(mantrasRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudFavorites = snapshot.docs.map(d => d.data() as SenseiResponse);
      setFavorites(cloudFavorites);
    });

    return () => unsubscribe();
  }, [user]);


  const isCacheFresh = useCallback(() => {
    const ts = Number(localStorage.getItem(LS.lastTs) || 0);
    return ts && Date.now() - ts < cacheTtlMs;
  }, [cacheTtlMs]);

  const withinDailyCap = useCallback(() => {
    const key = todayKey();
    const stamp = localStorage.getItem(LS.dayStamp);
    let count = Number(localStorage.getItem(LS.dayCount) || 0);
    if (stamp !== key) {
      localStorage.setItem(LS.dayStamp, key);
      localStorage.setItem(LS.dayCount, "0");
      count = 0;
    }
    return count < dailyCap;
  }, [dailyCap]);

  const bumpDailyCount = useCallback(() => {
    const key = todayKey();
    const stamp = localStorage.getItem(LS.dayStamp);
    const next = (Number(localStorage.getItem(LS.dayCount) || 0) + 1).toString();
    if (stamp !== key) localStorage.setItem(LS.dayStamp, key);
    localStorage.setItem(LS.dayCount, next);
  }, []);

  const saveLast = useCallback((resp: SenseiResponse) => {
    setLast(resp);
    writeJSON(LS.last, resp);
    localStorage.setItem(LS.lastTs, String(Date.now()));
  }, []);

  const addFavorite = useCallback(async (resp?: SenseiResponse) => {
    const payload = resp ?? last;
    if (!payload) return;

    const isAlreadyFavorited = favorites.some(fav => fav.mantra === payload.mantra);
    if (isAlreadyFavorited) {
      toast("This mantra is already in your favorites.");
      return;
    }

    if (user) {
      const mantrasRef = collection(firestore, 'users', user.uid, 'mantras');
      await addDoc(mantrasRef, payload);
    } else {
      const next = [payload, ...favorites].slice(0, 100);
      setFavorites(next);
      writeJSON(LS.favs, next);
    }
    
    toast("Saved to favorites");
    track("mantra_favorited", { insight_tag: payload.insight_tag });
  }, [favorites, last, toast, track, user]);

  const removeFavorite = useCallback(async (mantraText: string) => {
    if (user) {
        const mantrasRef = collection(firestore, 'users', user.uid, 'mantras');
        const q = query(mantrasRef);
        const querySnapshot = await getDocs(q);
        const docToDelete = querySnapshot.docs.find(d => d.data().mantra === mantraText);
        if (docToDelete) {
            await deleteDoc(doc(firestore, 'users', user.uid, 'mantras', docToDelete.id));
        }
    } else {
        const next = favorites.filter((fav) => fav.mantra !== mantraText);
        setFavorites(next);
        writeJSON(LS.favs, next);
    }
  }, [favorites, user]);

  const copyLast = useCallback(async () => {
    if (!last) return false;
    const ok = await copyToClipboard(last.mantra);
    toast(ok ? "Copied to clipboard" : "Copy failed");
    if (ok) track("mantra_copy", { insight_tag: last.insight_tag });
    return ok;
  }, [last, toast, track]);

  const clearCache = useCallback(() => {
    setLast(null);
    localStorage.removeItem(LS.last);
    localStorage.removeItem(LS.lastTs);
  }, []);
  
  const showFavorites = () => {
    setShowFavoritesDialog(true);
  }

  const generate = useCallback(async (context: SenseiContext, forceNew = false): Promise<SenseiResponse> => {
    setError(null);

    const now = Date.now();
    if (now < nextAllowedAtRef.current && forceNew) {
      const waitMs = nextAllowedAtRef.current - now;
      toast(`Please wait ${Math.ceil(waitMs / 1000)}s before getting another mantra`);
      throw new Error("cooldown");
    }

    if (!withinDailyCap() && forceNew) {
      toast("Daily mantra limit reached");
      if (last) {
        return { ...last, source: 'cache' }; 
      }
      throw new Error("daily_cap");
    }

    if (!forceNew && isCacheFresh() && last) {
      track("mantra_open", { cached: true, insight_tag: last.insight_tag });
      return { ...last, source: 'cache' };
    }

    setLoading(true);
    track("mantra_open", { cached: false, forced: forceNew });

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context }), 
        signal: ac.signal,
      });

      if (!resp.ok) {
        console.error(`API request failed with status ${resp.status}`);
        const fallbackWithSource = { ...LOCAL_FALLBACK, source: 'fallback (client)' };
        saveLast(fallbackWithSource);
        return fallbackWithSource;
      }

      const source = resp.headers.get("X-Sensei-Source") || "provider";
      const json = await resp.json();
      const val = SenseiResponseSchema.safeParse(json);
      
      let finalResp: SenseiResponse;
      if (val.success) {
        finalResp = { ...val.data, source };
      } else {
        console.error("Invalid response from API:", val.error);
        throw new Error("Invalid response from API");
      }

      saveLast(finalResp);
      if (forceNew) {
        bumpDailyCount();
        nextAllowedAtRef.current = Date.now() + cooldownMs;
      }
      toast("New mantra ready");
      track("mantra_generated", { insight_tag: finalResp.insight_tag });
      return finalResp;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Fetch aborted');
        throw e;
      }
      setError(e?.message || "Failed to generate mantra");
      const fallbackWithSource = { ...LOCAL_FALLBACK, source: 'fallback (client)' };
      saveLast(fallbackWithSource);
      return fallbackWithSource;
    } finally {
      setLoading(false);
    }
  }, [endpoint, cooldownMs, withinDailyCap, isCacheFresh, last, toast, track, saveLast, bumpDailyCount]);

  const state = useMemo(() => ({ loading, error, last }), [loading, error, last]);

  return { state, generate, favorites, addFavorite, removeFavorite, copyLast, clearCache, showFavorites, showFavoritesDialog, setShowFavoritesDialog } as const;
}
