import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Numeric input with decrement/increment controls.
 *
 * The typed field stays editable rather than being replaced by the buttons: a doctor entering
 * 62.5 should not have to press + thirteen times, and a stepper that blocks typing is slower
 * than a plain box for anything but small adjustments.
 *
 * Values are clamped to [min, max] and rounded to the step's precision, so repeated floating
 * point addition cannot drift a dose to 7.500000000000001.
 */
const NumberStepper = React.forwardRef(
  ({ value, onChange, step = 1, min = 0, max = Infinity, precision, suffix, disabled, className, inputClassName, ...props }, ref) => {
    // Derive decimal places from the step unless told otherwise: step 0.5 implies one place.
    const decimals = precision ?? (String(step).includes('.') ? String(step).split('.')[1].length : 0);

    const clamp = (n) => Math.min(max, Math.max(min, n));
    const round = (n) => Number(clamp(n).toFixed(decimals));

    const current = Number.isFinite(Number(value)) ? Number(value) : min;

    const bump = (delta) => {
      if (disabled) return;
      onChange(round(current + delta));
    };

    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || current <= min}
          onClick={() => bump(-step)}
          aria-label={`Decrease by ${step}${suffix ? ' ' + suffix : ''}`}
          className="shrink-0"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <div className="relative flex-1">
          <Input
            ref={ref}
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max === Infinity ? undefined : max}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value;
              // Allow an empty field mid-edit rather than snapping to 0 on backspace.
              if (raw === '') return onChange('');
              const n = Number(raw);
              if (Number.isFinite(n)) onChange(n);
            }}
            // Only clamp on blur — clamping per keystroke makes "12" impossible when max is 15.
            onBlur={() => {
              if (value === '' || value == null) return onChange(min);
              onChange(round(Number(value)));
            }}
            className={cn(
              'text-center font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              suffix && 'pr-10',
              inputClassName,
            )}
            {...props}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || current >= max}
          onClick={() => bump(step)}
          aria-label={`Increase by ${step}${suffix ? ' ' + suffix : ''}`}
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  },
);
NumberStepper.displayName = 'NumberStepper';

export { NumberStepper };
