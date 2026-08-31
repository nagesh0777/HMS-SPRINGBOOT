import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';

/**
 * A search palette. Deliberately not the standard DialogContent: this one has no visible title
 * bar, so it supplies its own accessible title for screen readers, and it opens focused on the
 * input because that is the only reason it exists.
 *
 * Replaces a hand-rolled overlay that trapped no focus — Tab would walk out of the palette and
 * into the page behind it while the backdrop was still up.
 */
export function CommandDialog({ open, onOpenChange, children, label = 'Search' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-md" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[15%] z-[9999] w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-xl border bg-popover p-0 shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to search. Results update as you type. Press Escape to close.
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function CommandInput({ className, ...props }) {
  return (
    <div className="flex items-center gap-3 border-b px-4">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        className={cn(
          'flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <DialogPrimitive.Close className="rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Close search</span>
      </DialogPrimitive.Close>
    </div>
  );
}

export function CommandList({ className, ...props }) {
  return <div className={cn('max-h-[60vh] overflow-y-auto overflow-x-hidden p-2', className)} {...props} />;
}

export function CommandEmpty({ className, ...props }) {
  return <div className={cn('py-10 text-center text-sm text-muted-foreground', className)} {...props} />;
}

export function CommandItem({ className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}
