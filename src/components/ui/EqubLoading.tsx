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
        <div className="relative overflow-hidden">
          <span className="relative z-10 text-3xl font-semibold tracking-tight text-emerald-600 sm:text-4xl">
            Equb
          </span>
          <span className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute inset-y-0 left-[-60%] w-1/2 animate-[equb-wave_1.6s_linear_infinite] rounded-full bg-gradient-to-r from-transparent via-gray-300/90 to-transparent" />
          </span>
        </div>
        {subtitle ? (
          <p className="text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
