import { cn } from '@/lib/utils';

/**
 * The Trikaar mark. HMS is a product under the Trikaar brand, so this is the parent
 * lockup rather than an HMS-specific mark.
 *
 * The source art is a single flat navy. Rather than shipping a second white asset and
 * keeping the two in sync, dark mode drives it to white with a filter —
 * brightness(0) collapses every pixel to black, invert(1) lifts it to white, and the
 * alpha channel is untouched so the silhouette survives exactly.
 */

export function Logo({ variant = 'full', className, ...props }) {
  const src = variant === 'mark' ? '/trikaar-mark.png' : '/trikaar-logo.png';

  return (
    <img
      src={src}
      alt="Trikaar"
      draggable={false}
      className={cn(
        'select-none object-contain dark:[filter:brightness(0)_invert(1)]',
        variant === 'mark' ? 'h-8 w-8' : 'h-7 w-auto',
        className,
      )}
      {...props}
    />
  );
}

/** Logo plus the product name, for the sidebar header and the login screen. */
export function LogoLockup({ className, showProduct = true, ...props }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} {...props}>
      <Logo variant="full" className="h-6" />
      {showProduct && (
        <>
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-[13px] font-semibold tracking-tight text-muted-foreground">HMS</span>
        </>
      )}
    </div>
  );
}
