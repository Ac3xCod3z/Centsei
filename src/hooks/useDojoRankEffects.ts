"use client";

import { useEffect, useRef } from "react";
import type { DojoRank } from "@/lib/types";
import type JSConfetti from "js-confetti";

export function useDojoRankEffects(
  dojoRank: DojoRank | null | undefined,
  toast: (args: { title?: string; description?: string; variant?: string }) => void,
  confettiRef: React.MutableRefObject<JSConfetti | null>
) {
  const previousDojoRankRef = useRef<DojoRank | null>(null);

  useEffect(() => {
    if (!dojoRank) return;

    if (previousDojoRankRef.current && previousDojoRankRef.current.level < dojoRank.level) {
      toast({
        title: "Dojo Promotion!",
        description: `The path of the Grasshoppa blossoms—${dojoRank.name} unlocked!`,
      });
      if (confettiRef.current) {
        confettiRef.current.addConfetti({
          confettiColors: [dojoRank.belt.color, "#FFFFFF", "#FBBF24"],
          confettiNumber: 100,
        });
      }
    }

    previousDojoRankRef.current = dojoRank;
  }, [dojoRank, toast, confettiRef]);
}

