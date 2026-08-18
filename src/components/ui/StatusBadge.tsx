import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

const statusVariantMap: Record<string, keyof typeof variantStyles> = {
  PAID: "success",
  SUCCESS: "success",
  COMPLETED: "success",
  ELIGIBLE: "success",
  ACTIVE: "success",
  APPROVED: "success",
  PENDING: "warning",
  INITIATED: "warning",
  UPCOMING: "info",
  OVERDUE: "danger",
  FAILED: "danger",
  REJECTED: "danger",
  CANCELLED: "danger",
  NOT_ELIGIBLE: "default",
  DRAFT: "default",
  LOCKED: "purple",
  DRAWN: "purple",
  WAITING_FOR_ELIGIBILITY: "warning",
  DRAW_PENDING: "warning",
  PAUSED: "warning",
  OPEN_FOR_MEMBERS: "info",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] ?? "default";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
