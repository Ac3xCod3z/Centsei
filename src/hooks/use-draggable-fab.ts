// src/hooks/use-draggable-fab.ts
"use client";

import { useState, useRef, useMemo } from 'react';

type DraggableFabOptions = {
    initialPosition?: { x: number; y: number };
    onClick?: () => void;
};

export function useDraggableFab({ initialPosition = { x: 16, y: 16 }, onClick }: DraggableFabOptions) {
    const [position, setPosition] = useState(initialPosition);
    const fabRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlers = useMemo(() => ({
        onPointerDown: (e: React.PointerEvent) => {
            isDraggingRef.current = false;
            // Set a short timeout. If the pointer hasn't moved, it's a click. 
            // If it moves, the timeout is cleared and it becomes a drag.
            clickTimeoutRef.current = setTimeout(() => {
                isDraggingRef.current = true;
                fabRef.current?.setPointerCapture(e.pointerId);
                dragStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    posX: position.x,
                    posY: position.y,
                };
            }, 150); // A small delay to distinguish click from drag
        },
        onPointerMove: (e: React.PointerEvent) => {
            if (!isDraggingRef.current) return;
            
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            setPosition({
                x: dragStartRef.current.posX - dx,
                y: dragStartRef.current.posY - dy,
            });
        },
        onPointerUp: (e: React.PointerEvent) => {
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }

            if (fabRef.current?.hasPointerCapture(e.pointerId)) {
                fabRef.current.releasePointerCapture(e.pointerId);
            }
            
            if (!isDraggingRef.current && onClick) {
                onClick();
            }
            
            isDraggingRef.current = false;
        },
        isDragging: isDraggingRef.current,
    }), [position, onClick]);

    return { position, fabRef, handlers };
}
