
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
import { Award, Shield, Gem, Crown, Anchor } from 'lucide-react';
import { getRank } from "@/lib/budget-score";
import React from "react";
import { ScrollArea } from "./ui/scroll-area";

interface BudgetScoreInfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoPoint = ({ title, children, badgeText }: { title: string, children: React.ReactNode, badgeText: string }) => (
    <div className="flex items-start gap-4">
        <Badge variant="secondary" className="mt-1 whitespace-nowrap">{badgeText}</Badge>
        <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{children}</p>
        </div>
    </div>
);

const RankInfo = ({ score, title, icon, children }: { score: string, title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 w-16">
            <div className="text-accent">{icon}</div>
            <span className="font-bold text-sm">{title}</span>
            <Badge variant="outline">{score}</Badge>
        </div>
        <p className="text-sm text-muted-foreground flex-1 pt-1">{children}</p>
    </div>
);


export function BudgetScoreInfoDialog({ isOpen, onClose }: BudgetScoreInfoDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Sensei's Evaluation Explained</DialogTitle>
                    <DialogDescription>
                        Your score is a measure of your financial discipline. Here's how the Sensei grades your progress.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-4 py-4">
                        <h4 className="font-semibold text-center">How Your Score is Calculated</h4>
                        <InfoPoint title="Spending vs. Income" badgeText="40%">
                            This is the core of your training. A lower ratio of spending to income means you have more control and a higher score.
                        </InfoPoint>
                        <InfoPoint title="Savings Rate" badgeText="35%">
                            The true sign of a master is what they keep. The more of your income you save, the stronger your financial stance becomes.
                        </InfoPoint>
                        <InfoPoint title="Debt Management" badgeText="25%">
                            Sensei rewards those who face their debts. A lower percentage of your income going to debt payments strengthens your score.
                        </InfoPoint>
                    </div>

                    <Separator />

                    <div className="space-y-4 py-4">
                        <h4 className="font-semibold text-center">Your Path to Mastery</h4>
                        <RankInfo score="0-39" title="Novice" icon={<Anchor className="w-6 h-6" />}>The journey begins. Focus on the fundamentals: track every expense, build awareness.</RankInfo>
                        <RankInfo score="40-59" title="Apprentice" icon={<Shield className="w-6 h-6" />}>You show promise. Start to build a buffer and reduce unnecessary spending.</RankInfo>
                        <RankInfo score="60-79" title="Adept" icon={<Award className="w-6 h-6" />}>Your skills are sharp. Consistently save and begin to tackle larger debts.</RankInfo>
                        <RankInfo score="80-89" title="Master" icon={<Gem className="w-6 h-6" />}>You move with purpose. Your finances are well-controlled and growing.</RankInfo>
                        <RankInfo score="90-100" title="Sensei" icon={<Crown className="w-6 h-6" />}>You have achieved financial enlightenment. Your discipline is an inspiration.</RankInfo>
                    </div>

                    <div className="text-center text-xs text-muted-foreground pt-4">
                        Improve these areas, and you shall achieve financial enlightenment.
                    </div>
                </ScrollArea>
                 <DialogFooter className="p-6 pt-4">
                    <Button onClick={onClose} className="w-full">Understood</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
