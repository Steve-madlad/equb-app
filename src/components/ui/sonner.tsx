"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-sky-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-rose-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-slate-400" />,
      }}
      toastOptions={{
        classNames: {
          toast: isDark
            ? [
                // Dark mode — glassmorphism
                "!bg-slate-900/90 !backdrop-blur-xl",
                "!border !border-white/10",
                "!shadow-2xl !shadow-black/50",
                "!text-slate-100",
                "!rounded-2xl",
                "!px-4 !py-3.5",
              ].join(" ")
            : [
                // Light mode — crisp white card
                "!bg-white/95 !backdrop-blur-xl",
                "!border !border-slate-200/80",
                "!shadow-xl !shadow-slate-200/60",
                "!text-slate-900",
                "!rounded-2xl",
                "!px-4 !py-3.5",
              ].join(" "),
          title: isDark
            ? "!text-sm !font-semibold !text-slate-100"
            : "!text-sm !font-semibold !text-slate-900",
          description: isDark
            ? "!text-xs !text-slate-400 !mt-0.5 !leading-relaxed"
            : "!text-xs !text-slate-500 !mt-0.5 !leading-relaxed",
          icon: "!mt-0.5 !shrink-0",
          closeButton: isDark
            ? "!text-slate-500 hover:!text-slate-200 !bg-transparent hover:!bg-white/10 !rounded-xl !transition-colors"
            : "!text-slate-400 hover:!text-slate-700 !bg-transparent hover:!bg-slate-100 !rounded-xl !transition-colors",
          // Per-type left-border accent
          success: "!border-l-2 !border-l-emerald-500/70",
          error: "!border-l-2 !border-l-rose-500/70",
          warning: "!border-l-2 !border-l-amber-500/70",
          info: "!border-l-2 !border-l-sky-500/70",
          loading: "!border-l-2 !border-l-slate-400/50",
          actionButton: [
            "!text-xs !font-semibold !px-3 !py-1.5 !rounded-xl",
            "!bg-emerald-500 hover:!bg-emerald-400 !text-white",
            "!transition-colors !duration-150",
          ].join(" "),
          cancelButton: isDark
            ? "!text-xs !font-medium !px-3 !py-1.5 !rounded-xl !bg-white/10 hover:!bg-white/20 !text-slate-300 !transition-colors"
            : "!text-xs !font-medium !px-3 !py-1.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-600 !transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
