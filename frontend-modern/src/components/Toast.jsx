import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * App-wide notifications, rebuilt on the shadcn token palette.
 *
 * The public API is unchanged — `<ToastProvider>` and `useToast() -> { showToast }` — so the
 * eleven screens already calling `showToast(message, type)` needed no edits.
 *
 * The container is an aria-live region, which the previous version was not: a toast that only
 * appears visually is invisible to a screen reader, and in a clinical app the toast is often the
 * only confirmation that a record actually saved.
 */
const ToastContext = createContext(null);

const TYPES = {
  success: { icon: CheckCircle, className: 'border-success/30 bg-success/10 text-success', bar: 'bg-success' },
  error: { icon: XCircle, className: 'border-destructive/30 bg-destructive/10 text-destructive', bar: 'bg-destructive' },
  warning: { icon: AlertTriangle, className: 'border-warning/30 bg-warning/10 text-warning', bar: 'bg-warning' },
  info: { icon: Info, className: 'border-primary/30 bg-accent text-accent-foreground', bar: 'bg-primary' },
};

const DEFAULT_DURATION = 4000;

function ToastItem({ toast, onDismiss }) {
  const meta = TYPES[toast.type] ?? TYPES.info;
  const Icon = meta.icon;

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-300',
        meta.className,
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-9">
        <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
        <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="absolute right-2.5 top-3 rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress bar doubles as the countdown, so a toast never disappears unexplained. */}
      <div
        className={cn('h-0.5 origin-left', meta.bar)}
        style={{ animation: `toast-progress ${toast.duration}ms linear forwards` }}
      />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type, duration }]);
    return id;
  }, []);

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // polite, not assertive: these confirm actions the user just took, and should not
        // interrupt whatever a screen reader is currently saying.
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-[10000] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return ctx;
}

export default ToastProvider;
