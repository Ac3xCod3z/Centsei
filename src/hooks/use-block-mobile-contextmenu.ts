
"use client";

import { useEffect } from "react";

function isMobileLike() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function useBlockMobileContextMenu(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !isMobileLike()) return;

    const onContextMenu = (e: Event) => {
      const t = e.target as HTMLElement | null;

      // Allow default on editable fields or anything explicitly opted-in
      if (
        t?.closest?.(
          'input, textarea, select, [contenteditable="true"], [data-allow-contextmenu="true"]'
        )
      ) {
        return;
      }

      // We’re inside the app; suppress the browser’s sheet.
      e.preventDefault();
    };

    // Capture phase ensures we run before default handling & outside React tree
    document.addEventListener("contextmenu", onContextMenu, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
    };
  }, [enabled]);
}
