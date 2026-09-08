import { cn } from '@/lib/utils';

/**
 * Clinical / workflow status, rendered consistently wherever it appears.
 *
 * The pill itself is neutral and the colour lives in a single dot. In a dense ward list
 * a dozen fully-tinted badges turn the screen into confetti and the one genuinely urgent
 * row stops standing out; a small saturated dot against neutral chrome keeps the scan
 * cheap and preserves the emphasis for `critical`.
 *
 * The map is the single source of truth for what a status *means* — previously each page
 * decided independently, so "Partial" was amber in billing and grey in the patient view.
 */

const TONE_DOT = {
  neutral: 'bg-muted-foreground/50',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
  info: 'bg-info',
};

// Keys are normalised: lowercased, non-alphanumerics stripped.
const STATUS_TONES = {
  // Settled / no action needed
  ok: 'success',
  paid: 'success',
  active: 'success',
  completed: 'success',
  finalized: 'success',
  dispensed: 'success',
  available: 'success',
  discharged: 'success',
  onduty: 'success',

  // In flight
  scheduled: 'info',
  booked: 'info',
  checkedin: 'info',
  inconsultation: 'info',
  senttopharmacy: 'info',
  inpatient: 'info',
  initiated: 'info',
  occupied: 'info',

  // Needs attention
  pending: 'warning',
  paymentpending: 'warning',
  partial: 'warning',
  onleave: 'warning',
  duetoday: 'warning',
  suspended: 'warning',

  // Act now
  emergency: 'critical',
  critical: 'critical',
  failed: 'critical',
  missed: 'critical',
  cancelled: 'critical',
  canceled: 'critical',
  overdue: 'critical',
  expired: 'critical',
};

const normalise = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Human label for a machine status: 'sent_to_pharmacy' -> 'Sent to pharmacy'. */
function humanise(status) {
  const s = String(status ?? '').replace(/[_-]+/g, ' ').trim();
  if (!s) return 'Unknown';
  // Split camelCase without breaking existing spaced labels.
  const spaced = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function statusTone(status) {
  return STATUS_TONES[normalise(status)] ?? 'neutral';
}

export function StatusPill({ status, label, tone, className }) {
  const resolved = tone ?? statusTone(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-foreground',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[resolved] ?? TONE_DOT.neutral)} />
      {label ?? humanise(status)}
    </span>
  );
}
