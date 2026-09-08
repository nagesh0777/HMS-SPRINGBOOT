import { cn } from '@/lib/utils';

/**
 * Shown when a list has nothing in it.
 *
 * The distinction that matters clinically: "no results for this filter" and "nothing has
 * been recorded yet" look identical to a bare table, but they need opposite responses —
 * widen the search, or create the first record. Callers pass the right `title` and
 * `action` for whichever case they are in.
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
