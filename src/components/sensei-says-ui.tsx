

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Copy, Heart, Info, Loader2, Wand2, Trash2 } from "lucide-react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type UseSenseiSaysReturn, type SenseiContext, type SenseiResponse } from "@/lib/sensei/useSenseiSays";
import type { BudgetScore, DojoRank, Goal, SeasonalEvent } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

type SenseiSaysUIProps = {
    sensei: UseSenseiSaysReturn;
    budgetScore: BudgetScore | null;
    dojoRank: DojoRank;
    weeklyTotals: { income: number; bills: number; net: number; };
    seasonalEvents: SeasonalEvent[];
    goals: Goal[];
}

function getAppContext({ budgetScore, dojoRank, weeklyTotals, seasonalEvents, goals }: Omit<SenseiSaysUIProps, 'sensei'>): SenseiContext {
  return {
    budget_health_score: budgetScore?.score ?? 50,
    dojo_rank: dojoRank.name,
    week_net_flow: weeklyTotals.net,
    seasonal_events_next_30d: seasonalEvents.map(e => ({
        ...e,
        expected_spend: e.expected_spend || 50,
    })),
    goals_summary: goals.map(g => ({ name: g.name, pct_to_target: (g.savedAmount / g.targetAmount) * 100 })),
  };
}

export default function SenseiSaysUI({ sensei, ...props}: SenseiSaysUIProps) {
  const [open, setOpen] = useState(false);
  const [tipAlt, setTipAlt] = useState(false);
  
  const { state, generate, addFavorite, removeFavorite, copyLast, favorites, showFavorites, showFavoritesDialog, setShowFavoritesDialog } = sensei;

  const context = useMemo(() => getAppContext(props), [props]);

  const [position, setPosition] = useState({ x: 16, y: 16 }); // Corresponds to bottom-4 right-4
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const fabRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function handleGenerate(forceNew = false) {
    if (state.loading && forceNew) return; 

    try {
      if (forceNew) {
        sensei.clearCache(); 
      }
      if (!open) setOpen(true);
      await generate(context, forceNew);
    } catch (e: any) {
      console.error("Generation failed:", e.message);
      if (!open) setOpen(true); 
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    clickTimeoutRef.current = setTimeout(() => {
        isDraggingRef.current = true;
        fabRef.current?.setPointerCapture(e.pointerId);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: position.x,
            posY: position.y,
        };
    }, 150);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setPosition({
        x: dragStartRef.current.posX - dx,
        y: dragStartRef.current.posY - dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
    }
    
    if (fabRef.current?.hasPointerCapture(e.pointerId)) {
        fabRef.current.releasePointerCapture(e.pointerId);
    }

    if (!isDraggingRef.current) {
        handleGenerate(false);
    }
    isDraggingRef.current = false;
  };
  
  const isFavorited = favorites.some(fav => fav.mantra === state.last?.mantra);

  // Guard against rendering when crucial data is missing, which causes mobile crashes.
  if (!props.budgetScore || !props.dojoRank) {
    return null;
  }
  
  return (
    <>
      <TooltipProvider delayDuration={150}>
        <div 
          ref={fabRef}
          className="fixed z-50"
          style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Tooltip>
            <TooltipTrigger asChild onMouseEnter={() => setTipAlt((x) => !x)}>
              <Button
                aria-label="Sensei Says. Tap for a fresh mantra."
                className={cn(
                    "h-16 w-16 rounded-full shadow-xl flex items-center justify-center bg-white text-black hover:bg-gray-200 touch-none",
                    isDraggingRef.current && "cursor-grabbing"
                )}
                disabled={state.loading && !open}
              >
                {state.loading && !open ? <Loader2 className="h-7 w-7 animate-spin" /> : <Image src="/Senseisays.png" alt="Sensei Says" width={52} height={52} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="select-none">
              <p className="text-sm">
                {tipAlt ? "Center your money mindset" : "Tap for a fresh mantra"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {open && (
          <MantraCard
            data={state.last}
            loading={state.loading}
            onClose={() => setOpen(false)}
            onCopy={copyLast}
            onFavorite={isFavorited ? () => state.last && removeFavorite(state.last.mantra) : () => addFavorite()}
            isFavorited={isFavorited}
            onNew={() => handleGenerate(true)}
            favoritesCount={favorites.length}
            position={position}
          />)
        }
      </TooltipProvider>

      <Dialog open={showFavoritesDialog} onOpenChange={setShowFavoritesDialog}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Favorite Mantras</DialogTitle>
                  <DialogDescription>Review and manage your saved wisdom from Sensei.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                  {favorites.length > 0 ? (
                      <div className="space-y-2 py-4">
                          {favorites.map((fav, index) => (
                              <div key={index} className="flex items-start justify-between gap-2 text-sm p-3 border rounded-md bg-secondary/50">
                                  <p className="flex-1 italic">"{fav.mantra}"</p>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFavorite(fav.mantra)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center text-sm text-muted-foreground p-4 border rounded-md border-dashed my-4">
                          <Heart className="mx-auto h-6 w-6 mb-2" />
                          No favorites yet. Find a mantra you like and click the heart!
                      </div>
                  )}
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-5 opacity-80">
      {children}
    </span>
  );
}

function MantraCard({
  data,
  loading,
  onClose,
  onCopy,
  onFavorite,
  isFavorited,
  onNew,
  favoritesCount,
  position
}: {
  data: SenseiResponse | null;
  loading: boolean;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
  onFavorite: () => void;
  isFavorited: boolean;
  onNew: () => void;
  favoritesCount: number;
  position: { x: number, y: number }
}) {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    
  return (
    <>
    <div 
        className="fixed z-40 w-[90vw] max-w-sm"
        style={{
            right: `${position.x}px`,
            bottom: `${position.y + 72}px`, 
        }}
    >
      <Card className="backdrop-blur supports-[backdrop-filter]:bg-white/5 relative">
         <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                      onClick={() => setIsInfoOpen(true)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>What is this?</TooltipContent>
            </Tooltip>
         </TooltipProvider>
        <CardHeader className="pb-2 flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Sensei Says
          </CardTitle>
           {data?.source && (
            <Badge variant="outline" className="text-xs">
                {data.source}
            </Badge>
           )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 min-h-[40px]">
            {loading ? "Reflecting on your path…" : data?.mantra ?? "Hold steady and let your plan guide today’s choices."}
          </p>
          {!loading && data && (
            <>
                <div className="flex flex-wrap gap-2">
                    {data.insight_tag && <Tag>{data.insight_tag.replaceAll("_", " ")}</Tag>}
                    {data.tone && <Tag>{data.tone}</Tag>}
                    {data.category && <Tag>{data.category}</Tag>}
                </div>
                {data.suggested_action && (
                    <div className="text-xs opacity-80">{data.suggested_action}</div>
                )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-center gap-2 pt-0 sm:justify-between">
            <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={onCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button size="sm" variant={isFavorited ? "default" : "secondary"} onClick={onFavorite}>
                <Heart className={cn("h-4 w-4 mr-1", isFavorited && "fill-current")} /> Favorite ({favoritesCount})
                </Button>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
                <Button size="sm" onClick={onNew} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-1" /> New</>}
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
    
    <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sensei Says Explained</DialogTitle>
                <DialogDescription>
                    Sensei Says is your personal AI guide. It analyzes your current financial context to provide a unique mantra and a suggested action to keep you on the path to mastery.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <AlertTitle>Insight Tag</AlertTitle>
                    <AlertDescription>
                        This explains *why* Sensei chose this mantra. It's the primary driver of the advice (e.g., 'event_spike_soon' if a big expense is coming up).
                    </AlertDescription>
                </Alert>
                 <Alert>
                    <AlertTitle>Tone</AlertTitle>
                    <AlertDescription>
                        Reflects the tone of voice for the mantra. Can be calm, encouraging, or direct.
                    </AlertDescription>
                </Alert>
                 <Alert>
                    <AlertTitle>Category</AlertTitle>
                    <AlertDescription>
                        Shows the financial category the mantra relates to, like savings, spending, or general discipline.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsInfoOpen(false)}>Got it</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
