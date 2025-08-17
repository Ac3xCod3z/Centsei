
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import gsap from "gsap";

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
    
    const onOpenAutoFocus = (e: Event) => {
        e.preventDefault();
        const content = (e.target as HTMLElement)?.closest('[data-radix-dialog-content]');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');

        if (content && overlay) {
           gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
           gsap.fromTo(content, 
            { scale: 0, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
           );
        }
    };
    
    const onCloseAutoFocus = (e: Event) => {
        e.preventDefault();
        const content = (e.target as HTMLElement)?.closest('[data-radix-dialog-content]');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        const closeButton = (e.target as HTMLElement);

        if(content && overlay) {
            gsap.to([content, overlay], {
                opacity: 0,
                scale: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    // This triggers the actual close logic in Radix after animation
                    const parentDialog = closeButton.closest('[data-radix-dialog-content]');
                    if(parentDialog) {
                         const closeButtonInside = parentDialog.querySelector('[data-radix-dialog-close-button]') as HTMLElement;
                         if (closeButtonInside) {
                           closeButtonInside.click();
                         }
                    }
                }
            });
        }
    }


    return (
      <DialogPortal>
        <DialogOverlay data-radix-dialog-overlay/>
        <DialogPrimitive.Content
          ref={ref}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            "data-[state=open]:animate-none data-[state=closed]:animate-none",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close 
            data-radix-dialog-close-button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
