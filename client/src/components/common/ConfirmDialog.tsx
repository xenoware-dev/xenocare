import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Show a text box (e.g. cancellation reason). */
  reason?: { label: string; placeholder?: string; required?: boolean };
}

export type ConfirmResult = { ok: false } | { ok: true; reason: string };

type ConfirmFn = (opts: ConfirmOptions) => Promise<ConfirmResult>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** App-wide confirm dialog. `const confirm = useConfirm(); if ((await confirm({...})).ok) …` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState('');
  const resolver = useRef<(r: ConfirmResult) => void>(undefined);

  const confirm = useCallback<ConfirmFn>((o) => {
    setReason('');
    setOpts(o);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: ConfirmResult) => {
    resolver.current?.(result);
    resolver.current = undefined;
    setOpts(null);
  };

  const blocked = !!opts?.reason?.required && !reason.trim();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(open) => !open && close({ ok: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
            {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {opts?.reason && (
            <div className="space-y-2">
              <Label htmlFor="confirm-reason">{opts.reason.label}</Label>
              <Textarea
                id="confirm-reason"
                rows={2}
                value={reason}
                placeholder={opts.reason.placeholder}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{opts?.cancelLabel ?? 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              disabled={blocked}
              onClick={() => close({ ok: true, reason: reason.trim() })}
              className={cn(opts?.destructive && 'bg-destructive text-white hover:bg-destructive/90')}
            >
              {opts?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
