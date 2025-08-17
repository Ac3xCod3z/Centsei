
// src/lib/dojo-journey.ts

import type { DojoRank, Goal } from './types';
import { formatCurrency } from './utils';

const MILESTONE_AMOUNT = 500;
const STRIPES_PER_BELT = 3; // 0, 1, 2 stripes

const BELTS = [
  { name: 'White Belt', color: '#FFFFFF' },
  { name: 'Yellow Belt', color: '#FCD34D' }, // text-yellow-400
  { name: 'Orange Belt', color: '#F97316' }, // text-orange-500
  { name: 'Green Belt', color: '#22C55E' }, // text-green-500
  { name: 'Blue Belt', color: '#3B82F6' }, // text-blue-500
  { name: 'Brown Belt', color: '#A16207' }, // text-yellow-700
  { name: 'Black Belt', color: '#18181B' }, // text-zinc-900
];

export const getDojoRank = (primaryGoal: Goal | null): DojoRank => {
  const balance = primaryGoal?.savedAmount ?? 0;

  if (balance < MILESTONE_AMOUNT) {
    return {
      level: 0,
      name: 'No Belt',
      belt: { name: 'No Belt', color: '#6B7280' }, // gray-500
      stripes: 0,
      nextMilestone: MILESTONE_AMOUNT,
      progress: primaryGoal ? (balance / MILESTONE_AMOUNT) * 100 : 0,
      balanceToNext: MILESTONE_AMOUNT - balance,
      nextRankName: `Next: White Belt at ${formatCurrency(MILESTONE_AMOUNT)}`,
    };
  }

  const level = Math.floor(balance / MILESTONE_AMOUNT);
  const beltIndex = Math.floor((level - 1) / STRIPES_PER_BELT);
  const stripeCount = (level - 1) % STRIPES_PER_BELT;

  const currentBelt = BELTS[Math.min(beltIndex, BELTS.length - 1)];
  const nextMilestone = (level + 1) * MILESTONE_AMOUNT;

  const rankName = `${currentBelt.name}${stripeCount > 0 ? `, ${stripeCount} Stripe${stripeCount > 1 ? 's' : ''}` : ''}`;
  
  const nextRankLevel = level + 1;
  const nextBeltIndex = Math.floor((nextRankLevel - 1) / STRIPES_PER_BELT);
  const nextStripeCount = (nextRankLevel - 1) % STRIPES_PER_BELT;
  const nextBelt = BELTS[Math.min(nextBeltIndex, BELTS.length - 1)];
  const nextRankName = `${nextBelt.name}${nextStripeCount > 0 ? ` + ${nextStripeCount} Stripe${nextStripeCount > 1 ? 's' : ''}` : ''}`;

  const currentMilestone = level * MILESTONE_AMOUNT;
  const progressToNext = ((balance - currentMilestone) / MILESTONE_AMOUNT) * 100;
  
  return {
    level: level,
    name: rankName,
    belt: currentBelt,
    stripes: stripeCount,
    nextMilestone: nextMilestone,
    nextRankName: `Next: ${nextRankName} at ${formatCurrency(nextMilestone)}`,
    progress: progressToNext,
    balanceToNext: nextMilestone - balance,
  };
};
