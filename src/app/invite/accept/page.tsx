"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { Check, AlertTriangle } from "lucide-react";

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const calendarId = params.get("calendarId") || "";
  const token = params.get("token") || "";

  useEffect(() => {
    async function run() {
      if (!calendarId || !token) {
        setStatus("error");
        setMessage("Missing invite token or calendarId.");
        return;
      }
      if (loading) return;
      if (!user) return; // wait for auth
      try {
        setStatus("working");
        const idToken = await user.getIdToken();
        const res = await fetch("/api/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ calendarId, token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Accept failed");
        try { localStorage.setItem("centseiActiveCalendarId", calendarId); } catch {}
        setStatus("success");
        setMessage("Invite accepted. You now have access to this calendar.");
      } catch (e: any) {
        setStatus("error");
        setMessage(String(e?.message || e) || "Failed to accept invite.");
      }
    }
    run();
  }, [calendarId, token, user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Accept Calendar Invite</h1>
        {!calendarId || !token ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> <span>Invalid or missing invite link.</span>
          </div>
        ) : loading ? (
          <p>Checking your session…</p>
        ) : !user ? (
          <div className="space-y-3">
            <p>Please sign in to accept this invitation.</p>
            <Button onClick={() => router.push("/login")}>Go to Sign In</Button>
          </div>
        ) : status === "working" ? (
          <p>Joining calendar…</p>
        ) : status === "success" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" /> <span>{message}</span>
            </div>
            <Button onClick={() => router.push("/")}>Open Dashboard</Button>
          </div>
        ) : status === "error" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> <span>{message || "Could not accept this invitation."}</span>
            </div>
            <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
          </div>
        ) : (
          <p>Ready to accept your invite.</p>
        )}
      </div>
    </div>
  );
}

