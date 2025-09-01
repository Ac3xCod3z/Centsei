// src/app/invite/accept/page.tsx
"use client";

import React, { Suspense } from "react";
import AcceptInviteFlow from "./AcceptInviteFlow";
import { CentseiLoader } from "@/components/centsei-loader";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<CentseiLoader isAuthLoading />}>
      <AcceptInviteFlow />
    </Suspense>
  );
}
