import { cn } from '@/lib/utils';

/**
 * Shared Recharts styling.
 *
 * Recharts renders real SVG into the document, so `hsl(var(--chart-1))` resolves against
 * the live cascade — the charts re-theme with everything else on a dark-mode flip with no
 * JS involved. Hardcoded hexes (what every chart here used before) cannot do that: a
 * #f3f4f6 gridline is invisible on a light page and glaring on a dark one.
 */

export const CHART = {
  series: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
};

/** Props shared by every XAxis/YAxis so ticks match body text rather than Recharts' defaults. */
export const axisProps = {
  tick: { fontSize: 11, fill: CHART.axis },
  axisLine: false,
  tickLine: false,
};

/**
 * Spread onto every Bar / Area / Line / Pie.
 *
 * Recharts 3.7 with React 19 never commits series geometry when the entry animation is
 * enabled: the <g class="recharts-bar-rectangle"> is created and left empty, so the axes
 * and grid draw but the bars, areas and pie sectors are invisible. Verified against a
 * minimal repro — it happens with a literal hex fill as well as a CSS variable, and with
 * StrictMode removed, so it is not a theming or double-render artefact and it ships to
 * production too.
 *
 * Turning the entry animation off renders correctly and costs nothing worth having: a
 * clinical dashboard does not benefit from bars growing out of the axis, and readers on
 * prefers-reduced-motion were skipping it anyway.
 */
export const seriesDefaults = { isAnimationActive: false };

/**
 * Tooltip body. Recharts' `contentStyle` cannot express a border radius plus a themed
 * border plus themed text reliably, so this renders the panel itself.
 */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label != null && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tabular ml-auto font-medium text-foreground">
              {formatter ? formatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact legend — Recharts' built-in one ignores the type scale. */
export function ChartLegend({ payload, className }) {
  if (!payload?.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 pt-2', className)}>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
