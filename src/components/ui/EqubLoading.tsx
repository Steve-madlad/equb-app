import { cn } from "@/lib/utils";

export function EqubLoading({
  className,
  subtitle,
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-gray-50 px-4",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="animate-[equb-text-wave_3.2s_linear_infinite] bg-size-[220%_100%] bg-linear-to-r from-emerald-600 via-gray-400 to-emerald-600 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
          Equb
        </span>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
