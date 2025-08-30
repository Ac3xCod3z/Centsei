"use client";

import { useEffect } from "react";
import { welcomeMessages } from "@/lib/messages";

export function useWelcomeToast(toast: (args: { title?: string; description?: string; variant?: string }) => void) {
  useEffect(() => {
    if (sessionStorage.getItem("centseiWelcomeShown")) return;
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    toast({ description: welcomeMessages[randomIndex] });
    sessionStorage.setItem("centseiWelcomeShown", "true");
  }, [toast]);
}

