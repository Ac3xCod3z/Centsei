
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';

export function CentseiLoader({ isAuthLoading = false }: { isAuthLoading?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  
  useEffect(() => {
    const tl = gsap.timeline();

    if (isAuthLoading) {
      // If we are just checking auth, simply fade in the loader and keep it.
      // The parent component will unmount this when done.
      tl.fromTo([logoRef.current, taglineRef.current], 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.2 }
      );
    } else {
      // This is the full entry animation for a logged-in user on first load.
      tl.fromTo([logoRef.current, taglineRef.current], 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.2 }
      )
      .to([logoRef.current, taglineRef.current], 
          { opacity: 0, scale: 0.8, duration: 0.5, ease: 'power2.in' },
          "+=1.5"
      )
      .to(containerRef.current, 
          { opacity: 0, duration: 0.3, ease: 'power2.in',
            onComplete: () => {
              if (containerRef.current) {
                containerRef.current.style.display = 'none';
              }
            }
          },
          "-=0.3"
      );
    }
  }, [isAuthLoading]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[200] flex h-screen w-full items-center justify-center bg-background flex-col gap-4 overflow-hidden">
      <div className="w-[300px] h-[90px]">
        <Image ref={logoRef} src="/CentseiLogo.png" alt="Centsei Logo" width={300} height={90} priority style={{ height: 'auto'}} />
      </div>
      <div className='absolute bottom-44'>
          <p ref={taglineRef} className='text-muted-foreground text-lg'>Your Wallets Personal Mr.Miyagi</p>
      </div>
    </div>
  );
}

    