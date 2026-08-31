import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog';

/**
 * Same props as the previous hand-rolled version, so the screens using it needed no change —
 * but now built on Radix, which brings the three things the old one lacked: focus is trapped
 * inside the dialog, the page behind is inert, and it is announced to screen readers.
 */
const TYPES = {
  danger: { icon: AlertTriangle, tint: 'bg-destructive/10 text-destructive border-destructive/20', variant: 'destructive' },
  warning: { icon: AlertTriangle, tint: 'bg-warning/10 text-warning border-warning/20', variant: 'default' },
  success: { icon: CheckCircle2, tint: 'bg-success/10 text-success border-success/20', variant: 'success' },
  info: { icon: Info, tint: 'bg-accent text-accent-foreground border-primary/20', variant: 'default' },
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
}) => {
  const meta = TYPES[type] ?? TYPES.info;
  const Icon = meta.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl border', meta.tint)}>
              <Icon className="h-5 w-5" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="mt-2">{message}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>{cancelText}</Button>
          <Button
            variant={meta.variant}
            onClick={() => { onConfirm(); onClose(); }}
            // Confirm is focused on open so Enter completes the action the user came for,
            // while Escape still cancels.
            autoFocus
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;
export { ConfirmationModal };
