
"use client";

import { cn } from '@/lib/utils';
import type { DojoRank } from '@/lib/types';
import React from 'react';

interface DojoBeltProps {
  rank: DojoRank;
  className?: string;
}

export const DojoBelt: React.FC<DojoBeltProps> = ({ rank, className }) => {
  const { belt, stripes } = rank;

  if (rank.level === 0) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}>
        Start your journey to earn your first belt!
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center justify-center w-full h-8 rounded-md overflow-hidden shadow-inner", className)} style={{ backgroundColor: belt.color }}>
      {/* Belt texture simulation */}
      <div className="absolute inset-0 bg-black/10"></div>
      
      {/* Tie knot simulation */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-8"
        style={{
          background: `linear-gradient(135deg, ${belt.color} 40%, rgba(0,0,0,0.2) 50%, ${belt.color} 60%)`
        }}
      ></div>

      {/* Stripes */}
      <div className="absolute right-4 flex gap-1.5">
        {Array.from({ length: stripes }).map((_, i) => (
          <div key={i} className="w-1.5 h-8 bg-black/70" />
        ))}
      </div>
      
      {/* Belt name */}
      <span className="font-bold text-sm z-10" style={{ color: belt.color === '#FFFFFF' || belt.color === '#FCD34D' ? '#000' : '#FFF' }}>
        {belt.name}
      </span>
    </div>
  );
};

