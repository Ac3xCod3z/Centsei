"use client";

import { useEffect } from "react";

function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  // Prefer capability detection over UA sniffing
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function useSuppressContextMenu(
  root: React.RefObject<HTMLElement>,
  enabled: boolean
) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || !isMobileLike()) return;

    // Prevent the browser context menu inside this subtree,
    // but allow it on inputs/textarea/select/contenteditable.
    const onCtx = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.(
          'input, textarea, select, [contenteditable="true"], [data-allow-contextmenu="true"]'
        )
      ) {
        return; // allow default on form fields
      }
      e.preventDefault();
    };

    // iOS Safari sometimes still shows callouts; CSS (Step 2) helps.
    el.addEventListener("contextmenu", onCtx);

    return () => {
      el.removeEventListener("contextmenu", onCtx);
    };
  }, [root, enabled]);
}
