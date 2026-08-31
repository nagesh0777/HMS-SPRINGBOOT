import * as React from 'react';
import { cn } from '@/lib/utils';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * A dose as an amount plus a unit, rather than the free-text string this app stored before
 * ("500mg", "1 packet", "5 ml"). Splitting them means the amount can be stepped, and a stored
 * dose can later be checked or converted — neither is possible with a string.
 *
 * Step size follows the unit, because the sensible increment differs: 1 ml for a syrup,
 * 2.5 ml for paediatric dosing by weight, 250 mg for a tablet strength. A single fixed step
 * would be wrong for most units.
 */
export const DOSAGE_UNITS = [
  { value: 'mg', label: 'mg', step: 50, max: 5000 },
  { value: 'ml', label: 'ml', step: 2.5, max: 500 },
  { value: 'g', label: 'g', step: 0.5, max: 50 },
  { value: 'mcg', label: 'mcg', step: 25, max: 2000 },
  { value: 'tablet', label: 'tablet', step: 0.5, max: 10 },
  { value: 'capsule', label: 'capsule', step: 1, max: 10 },
  { value: 'drop', label: 'drops', step: 1, max: 20 },
  { value: 'puff', label: 'puffs', step: 1, max: 10 },
  { value: 'unit', label: 'units', step: 2, max: 200 },
  { value: 'packet', label: 'packet', step: 1, max: 10 },
];

/** "500mg" / "2.5 ml" / "1 packet" → { amount, unit }. Tolerates the historic free-text values. */
export function parseDosage(text) {
  if (!text) return { amount: '', unit: 'mg' };
  if (typeof text === 'object') return { amount: text.amount ?? '', unit: text.unit ?? 'mg' };
  const match = String(text).trim().match(/^([\d.]+)\s*(.*)$/);
  if (!match) return { amount: '', unit: 'mg' };
  const amount = Number(match[1]);
  const rawUnit = (match[2] || 'mg').toLowerCase().replace(/s$/, '').trim();
  const known = DOSAGE_UNITS.find((u) => u.value === rawUnit);
  return { amount: Number.isFinite(amount) ? amount : '', unit: known ? known.value : 'mg' };
}

/** Back to the single string the API and the printed prescription still expect. */
export function formatDosage(amount, unit) {
  if (amount === '' || amount == null) return '';
  const meta = DOSAGE_UNITS.find((u) => u.value === unit);
  const label = meta ? meta.label : unit;
  // "500mg" reads naturally; "2.5 ml" and "1 tablet" need the space.
  return ['mg', 'g', 'mcg'].includes(unit) ? `${amount}${label}` : `${amount} ${label}`;
}

export function DosageInput({ amount, unit, onAmountChange, onUnitChange, disabled, className }) {
  const meta = DOSAGE_UNITS.find((u) => u.value === unit) ?? DOSAGE_UNITS[0];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <NumberStepper
        value={amount}
        onChange={onAmountChange}
        step={meta.step}
        min={0}
        max={meta.max}
        disabled={disabled}
        className="flex-1"
      />
      <Select value={unit} onValueChange={onUnitChange} disabled={disabled}>
        <SelectTrigger className="w-[110px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOSAGE_UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
