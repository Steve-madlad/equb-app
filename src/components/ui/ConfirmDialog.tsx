'use client';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description / body text */
  description: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual severity that controls colors and icon */
  variant?: ConfirmVariant;
  /** Pass true while the confirmed async action is running */
  loading?: boolean;
  /** Called when the user clicks the confirm button */
  onConfirm: () => void;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    iconBg: string;
    iconColor: string;
    icon: React.ReactNode;
    confirmClass: string;
  }
> = {
  danger: {
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
    icon: <Trash2 className="h-5 w-5" />,
    confirmClass: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 dark:border-rose-500',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: <AlertTriangle className="h-5 w-5" />,
    confirmClass:
      'bg-amber-600 hover:bg-amber-500 text-white border-amber-600 dark:border-amber-500',
  },
  info: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <Info className="h-5 w-5" />,
    confirmClass:
      'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const cfg = variantConfig[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.iconBg} ${cfg.iconColor}`}
            >
              {cfg.icon}
            </div>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DialogTitle className="text-base leading-snug font-bold text-slate-900 dark:text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 rounded-xl sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={onConfirm}
            className={`flex-1 rounded-xl border font-semibold sm:flex-none ${cfg.confirmClass}`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
