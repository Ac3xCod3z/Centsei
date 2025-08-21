
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useBodyNoCalloutToggle() {
  const pathname = usePathname();
  const isCalendarRoute = pathname === "/" || pathname?.startsWith("/view");

  useEffect(() => {
    if (isCalendarRoute) {
      document.body.classList.add("centsei-no-callout");
      return () => document.body.classList.remove("centsei-no-callout");
    }
  }, [isCalendarRoute]);
}
