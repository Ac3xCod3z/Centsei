
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { DojoBelt } from "./dojo-belt";
import type { DojoRank } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

interface DojoJourneyInfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const ranks: { rank: DojoRank, range: string }[] = [
    { rank: { level: 1, name: "White Belt", stripes: 0, belt: { name: "White", color: "#FFFFFF" }, progress: 0, nextMilestone: 2000, nextRankName: "", balanceToNext: 0 }, range: "$500 - $1,999" },
    { rank: { level: 4, name: "Yellow Belt", stripes: 0, belt: { name: "Yellow", color: "#FCD34D" }, progress: 0, nextMilestone: 3500, nextRankName: "", balanceToNext: 0  }, range: "$2,000 - $3,499" },
    { rank: { level: 7, name: "Orange Belt", stripes: 0, belt: { name: "Orange", color: "#F97316" }, progress: 0, nextMilestone: 5000, nextRankName: "", balanceToNext: 0  }, range: "$3,500 - $4,999" },
    { rank: { level: 10, name: "Green Belt", stripes: 0, belt: { name: "Green", color: "#22C55E" }, progress: 0, nextMilestone: 6500, nextRankName: "", balanceToNext: 0  }, range: "$5,000 - $6,499" },
    { rank: { level: 13, name: "Blue Belt", stripes: 0, belt: { name: "Blue", color: "#3B82F6" }, progress: 0, nextMilestone: 8000, nextRankName: "", balanceToNext: 0  }, range: "$6,500 - $7,999" },
    { rank: { level: 16, name: "Red Belt", stripes: 0, belt: { name: "Red", color: "#EF4444" }, progress: 0, nextMilestone: 9500, nextRankName: "", balanceToNext: 0  }, range: "$8,000 - $9,499" },
    { rank: { level: 19, name: "Brown Belt", stripes: 0, belt: { name: "Brown", color: "#A16207" }, progress: 0, nextMilestone: 11000, nextRankName: "", balanceToNext: 0  }, range: "$9,500 - $10,999" },
    { rank: { level: 22, name: "Black Belt", stripes: 0, belt: { name: "Black", color: "#18181B" }, progress: 0, nextMilestone: 11000, nextRankName: "", balanceToNext: 0  }, range: "$11,000 +" },
];

const InfoPoint = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{children}</p>
    </div>
);

const RankInfo = ({ rank, range }: { rank: DojoRank, range: string }) => (
    <div className="flex items-center gap-4">
        <DojoBelt rank={rank} className="w-24 h-6" />
        <div className="flex-1">
            <p className="font-semibold">{rank.belt.name} Belt</p>
            <p className="text-xs text-muted-foreground">{range}</p>
        </div>
    </div>
);

export function DojoJourneyInfoDialog({ isOpen, onClose }: DojoJourneyInfoDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>The Dojo Journey Explained</DialogTitle>
                    <DialogDescription>
                       Your path to financial mastery is measured by the progress on your primary Zen Savings goal.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-4 py-4">
                        <InfoPoint title="How It Works">
                            Your rank is determined by the "Currently Saved" amount in your first active savings goal. For every $500 you save, you advance one level.
                        </InfoPoint>
                        <InfoPoint title="Earning Stripes & Belts">
                           You earn a stripe for each level. After earning 2 stripes on your current belt, the next level promotes you to a new belt color, and your stripes reset.
                        </InfoPoint>
                    </div>

                    <Separator />

                    <div className="space-y-4 py-4">
                        <h4 className="font-semibold text-center">The Path of Belts</h4>
                        <div className="space-y-3">
                            {ranks.map(({ rank, range }) => <RankInfo key={rank.level} rank={rank} range={range} />)}
                        </div>
                    </div>

                    <div className="text-center text-xs text-muted-foreground pt-4">
                        True mastery is not about the destination, but the discipline of the journey.
                    </div>
                </ScrollArea>
                 <DialogFooter className="p-6 pt-4">
                    <Button onClick={onClose} className="w-full">Understood</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
