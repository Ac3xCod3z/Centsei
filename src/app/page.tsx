// src/app/page.tsx
"use client";

import CentseiDashboard from "@/components/centsei-dashboard";
import { useAuth } from "@/components/auth-provider";
import { CentseiLoader } from "@/components/centsei-loader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <CentseiLoader isAuthLoading />;
  }

  return (
    <CentseiDashboard />
  );
}
