"use client";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "info";

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
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    icon: <Trash2 className="w-5 h-5" />,
    confirmClass:
      "bg-rose-600 hover:bg-rose-500 text-white border-rose-600 dark:border-rose-500",
  },
  warning: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    icon: <AlertTriangle className="w-5 h-5" />,
    confirmClass:
      "bg-amber-600 hover:bg-amber-500 text-white border-amber-600 dark:border-amber-500",
  },
  info: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    icon: <Info className="w-5 h-5" />,
    confirmClass:
      "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const cfg = variantConfig[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}
            >
              {cfg.icon}
            </div>
            <div className="space-y-1 pt-0.5 min-w-0">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl flex-1 sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={onConfirm}
            className={`rounded-xl flex-1 sm:flex-none font-semibold border ${cfg.confirmClass}`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
