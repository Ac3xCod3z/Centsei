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
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlers = useMemo(() => ({
        onPointerDown: (e: React.PointerEvent) => {
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
            setIsDragging(false);
            
            clickTimeoutRef.current = setTimeout(() => {
                setIsDragging(true);
                fabRef.current?.setPointerCapture(e.pointerId);
                dragStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    posX: position.x,
                    posY: position.y,
                };
            }, 150);
        },
        onPointerMove: (e: React.PointerEvent) => {
            if (!isDragging) return;
            
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
            
            if (!isDragging && onClick) {
                onClick();
            }
            
            // This needs to be slightly delayed to prevent the click event from firing after a drag
            setTimeout(() => setIsDragging(false), 0);
        },
    }), [position, onClick, isDragging]);

    return { position, fabRef, handlers, isDragging };
}
