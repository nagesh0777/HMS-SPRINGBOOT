import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * A single KPI. Every dashboard in the app had its own hand-rolled version of this tile.
 *
 * `tone` is deliberately limited to clinical meaning. A count of waiting patients is not
 * "good" or "bad", so it stays neutral; only a genuine status (a critical alert, an
 * overdue follow-up) earns colour. Passing a tone for emphasis alone would dilute the
 * signal the colour is carrying elsewhere.
 */

const TONES = {
  neutral: { value: 'text-foreground', icon: 'text-muted-foreground bg-muted' },
  success: { value: 'text-foreground', icon: 'text-success bg-success-subtle' },
  warning: { value: 'text-foreground', icon: 'text-warning bg-warning-subtle' },
  critical: { value: 'text-destructive', icon: 'text-destructive bg-destructive-subtle' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  loading = false,
  onClick,
  className,
}) {
  const t = TONES[tone] ?? TONES.neutral;
  const interactive = typeof onClick === 'function';

  return (
    <Card
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={cn(
        'p-4 transition-colors',
        interactive &&
          'cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className={cn('tabular mt-1 text-2xl font-semibold tracking-tight', t.value)}>{value}</p>
          )}
          {hint && !loading && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', t.icon)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
    </Card>
  );
}
