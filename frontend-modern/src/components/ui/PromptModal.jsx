import React from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog';

/**
 * Same props as before. Radix now handles focus trapping and Escape; the manual setTimeout focus
 * hack the previous version needed is gone — autoFocus works because the dialog mounts its
 * content properly.
 */
const PromptModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Input required',
  message = 'Please enter the requested information below:',
  placeholder = 'Type here...',
  inputType = 'text',
  submitText = 'Submit',
  cancelText = 'Cancel',
}) => {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) { setValue(''); setError(''); }
  }, [isOpen]);

  const submit = () => {
    if (!value.trim()) {
      setError('This field cannot be empty');
      return;
    }
    onSubmit(value);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-accent-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="prompt-input" className="sr-only">{title}</Label>
          <Input
            id="prompt-input"
            type={inputType}
            value={value}
            placeholder={placeholder}
            autoFocus
            onChange={(e) => { setValue(e.target.value); if (error) setError(''); }}
            // Enter submits — this dialog exists to capture one value, so requiring a mouse
            // trip to the button would be pure friction.
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            aria-invalid={!!error}
          />
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>{cancelText}</Button>
          <Button onClick={submit}>{submitText}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PromptModal;
export { PromptModal };
