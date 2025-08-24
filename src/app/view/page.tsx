

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/icons';
import ViewOnlyCalendar from '@/components/view-only-calendar';

function ViewPageSkeleton() {
    return (
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Logo height={50} width={50} />
            <h1 className="text-2xl font-bold text-foreground">Centsei</h1>
          </div>
          <Skeleton className="h-10 w-10 md:hidden" />
        </header>
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </main>
          <aside className="w-[350px] border-l overflow-y-auto p-6 hidden lg:block">
            <Skeleton className="h-8 w-32 mb-6" />
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </aside>
        </div>
      </div>
    );
}

export default function ViewPage() {
  return (
    <Suspense fallback={<ViewPageSkeleton />}>
      <ViewOnlyCalendar />
    </Suspense>
  );
}
