"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calculator, Settings, Menu, PieChart, BarChartBig, AreaChart, Target, TrendingUp, Trophy, Heart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./centsei-calendar";

type TopbarProps = {
  isMobile: boolean;
  user: { displayName?: string | null; photoURL?: string | null } | null;
  signOut: () => void;
  // desktop buttons
  setCalculatorOpen: (v: boolean) => void;
  setSettingsDialogOpen: (v: boolean) => void;
  // menu actions
  setMonthlySummaryOpen: (v: boolean) => void;
  setMonthlyBreakdownOpen: (v: boolean) => void;
  setEnsoInsightsOpen: (v: boolean) => void;
  setGoalsOpen: (v: boolean) => void;
  setSenseiEvalOpen: (v: boolean) => void;
  setDojoJourneyOpen: (v: boolean) => void;
  senseiSays: { showFavorites: () => void };
  // mobile sheet
  isMobileSheetOpen: boolean;
  setMobileSheetOpen: (v: boolean) => void;
  mobileMenuFabRef: React.RefObject<HTMLDivElement>;
  mobileMenuPosition: { x: number; y: number };
  mobileMenuHandlers: any;
  isMobileMenuDragging: boolean;
  payPeriods: any[];
  activePeriodIndex: number;
  initialBalance: number;
};

export function DashboardTopbar(props: TopbarProps) {
  const {
    isMobile,
    user,
    signOut,
    setCalculatorOpen,
    setSettingsDialogOpen,
    setMonthlySummaryOpen,
    setMonthlyBreakdownOpen,
    setEnsoInsightsOpen,
    setGoalsOpen,
    setSenseiEvalOpen,
    setDojoJourneyOpen,
    senseiSays,
    isMobileSheetOpen,
    setMobileSheetOpen,
    mobileMenuFabRef,
    mobileMenuPosition,
    mobileMenuHandlers,
    isMobileMenuDragging,
    payPeriods,
    activePeriodIndex,
    initialBalance,
  } = props;

  return (
    <header className="flex h-20 items-center justify-between border-b px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
      </div>
      <div className="flex items-center gap-2">
        {isMobile && (
          <div
            ref={mobileMenuFabRef}
            className="fixed z-50"
            style={{ right: `${mobileMenuPosition.x}px`, bottom: `${mobileMenuPosition.y}px` }}
            {...mobileMenuHandlers}
          >
            <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  aria-label="Open Menu"
                  className={cn(
                    "h-16 w-16 rounded-full shadow-xl flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 touch-none",
                    isMobileMenuDragging && "cursor-grabbing"
                  )}
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col w-3/4">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Pay Period</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  <SidebarContent periods={payPeriods} activeIndex={activePeriodIndex} initialBalance={initialBalance} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {!isMobile && (
          <>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)}>
              <Calculator className="h-5 w-5" />
              <span className="sr-only">Calculator</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsDialogOpen(true)}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Guest"} />
                <AvatarFallback>{user?.displayName?.[0] || "G"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName || "Guest User"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setMonthlySummaryOpen(true)}>
              <PieChart className="mr-2 h-4 w-4" />Monthly Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMonthlyBreakdownOpen(true)}>
              <BarChartBig className="mr-2 h-4 w-4" />Category Breakdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEnsoInsightsOpen(true)}>
              <AreaChart className="mr-2 h-4 w-4" />Enso's Insights
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGoalsOpen(true)}>
              <Target className="mr-2 h-4 w-4" />Zen Goals
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSenseiEvalOpen(true)}>
              <TrendingUp className="mr-2 h-4 w-4" />Sensei's Evaluation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDojoJourneyOpen(true)}>
              <Trophy className="mr-2 h-4 w-4" />Dojo Journey
            </DropdownMenuItem>
            {isMobile && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCalculatorOpen(true)}>
                  <Calculator className="mr-2 h-4 w-4" />Calculator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />Settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => senseiSays.showFavorites()}>
              <Heart className="mr-2 h-4 w-4" />Favorite Mantras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

